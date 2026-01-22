<template>
  <div class="elim-container">
    <!-- 1. HUD: 游戏进行时的界面 (带退出按钮) -->
    <div v-if="localState === 'playing'" class="hud">
      <div class="hud-content">
        <div class="hud-section left">
          <div class="label">MOVES</div>
          <div class="value-text" :class="{ 'text-danger': movesLeft <= 5 }">{{ movesLeft }}</div>
        </div>

        <div class="hud-section center">
          <div class="label">SCORE</div>
          <div class="score-display">
            <span class="current-score">{{ score }}</span>
            <span class="target-divider">/</span>
            <span class="target-score">{{ levelGoal || '∞' }}</span>
          </div>
        </div>

        <div class="hud-section right">
          <button class="quit-btn" @click="confirmExit">退出</button>
        </div>
      </div>
    </div>

    <!-- 2. 游戏棋盘 -->
    <div class="board-wrapper">
      <div class="board" :class="{ 'processing': isProcessing }">
        <div v-for="(row, r) in board" :key="'r' + r" class="row">
          <div v-for="(cell, c) in row" :key="'c' + c" class="cell" :class="{ 'selected': isSelected(r, c) }"
            @click="handleCellClick(r, c)">
            <transition name="pop">
              <div v-if="cell" class="tile" :style="{ backgroundColor: cell.color }">
                {{ cell.icon }}
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. 全屏弹窗式遮罩 -->
    <transition name="fade">
      <div v-if="localState !== 'playing' || showResumePrompt" class="game-overlay">

        <div class="modal-card">

          <!-- 恢复进度弹窗 -->
          <div v-if="showResumePrompt" class="modal-content">
            <h2 class="modal-title">继续上一局？</h2>
            <p class="modal-desc">检测到未完成的关卡进度</p>
            <div class="btn-group-vertical">
              <button class="primary-btn" @click="resumeGame">继续本局</button>
              <button class="secondary-btn" @click="discardAndNew">重新开始</button>
            </div>
          </div>

          <!-- 模式选择 -->
          <div v-else-if="localState === 'selectMode'" class="modal-content">
            <h1 class="game-logo">消消乐</h1>
            <div class="mode-options">
              <div class="mode-item" @click="localState = 'selectLevel'">
                <div class="mode-icon">🚀</div>
                <div class="mode-info">
                  <h3>闯关模式</h3>
                  <p>已解锁至第 {{ unlockedLevel }} 关</p>
                </div>
                <div class="mode-arrow">→</div>
              </div>
              <div class="mode-item" @click="initGame('infinite')">
                <div class="mode-icon">⚡</div>
                <div class="mode-info">
                  <h3>无限模式</h3>
                  <p>最高分记录: {{ highScore }}</p>
                </div>
                <div class="mode-arrow">→</div>
              </div>
            </div>
            <button class="text-btn" @click="$emit('back')">返回大厅</button>
          </div>

          <!-- 关卡选择 (列表样式) -->
          <div v-else-if="localState === 'selectLevel'" class="modal-content">
            <h2 class="modal-title">选择关卡</h2>
            <div class="level-list">
              <div v-for="lv in ELIM_CONFIG.levels" :key="lv.id" class="level-row"
                :class="{ 'locked': lv.id > unlockedLevel }"
                @click="lv.id <= unlockedLevel ? initGame('level', lv.id) : null">
                <div class="lv-badge">{{ lv.id > unlockedLevel ? '🔒' : lv.id }}</div>
                <div class="lv-main">
                  <h4>{{ lv.name }}</h4>
                  <p>目标: {{ lv.targetScore }} 分</p>
                </div>
                <div v-if="lv.id <= unlockedLevel" class="lv-play-tag">开始</div>
              </div>
            </div>
            <button class="text-btn" @click="localState = 'selectMode'">返回模式选择</button>
          </div>

          <!-- 结算界面 -->
          <div v-else-if="['win', 'gameOver'].includes(localState)" class="modal-content">
            <h2 :class="localState === 'win' ? 'text-win' : 'text-lose'">
              {{ localState === 'win' ? '挑战成功!' : '游戏结束' }}
            </h2>
            <div class="result-stats">
              <div class="stat-item">
                <span class="label">FINAL SCORE</span>
                <span class="value">{{ score }}</span>
              </div>
            </div>
            <div class="btn-group-vertical">
              <button class="primary-btn" @click="initGame(activeMode, activeLevel)">再次挑战</button>
              <button v-if="localState === 'win' && hasNext" class="success-btn" @click="nextLevel">下一关</button>
              <button class="secondary-btn" @click="localState = 'selectMode'">返回菜单</button>
            </div>
          </div>

        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { ELIM_CONFIG } from '../config';

const emit = defineEmits(['back']);

// --- 存储 Key ---
const STORAGE = {
  PROGRESS: 'elim_unlocked_level',
  HIGHSCORE: 'elim_highscore',
  SAVE: 'elim_save_data'
};

const board = ref([]);
const score = ref(0);
const movesLeft = ref(0);
const localState = ref('selectMode');
const activeMode = ref('level');
const activeLevel = ref(1);
const unlockedLevel = ref(1);
const highScore = ref(0);
const showResumePrompt = ref(false);
const isProcessing = ref(false);
const selectedCell = ref(null);

const levelGoal = computed(() => activeMode.value === 'level' ? ELIM_CONFIG.levels.find(l => l.id === activeLevel.value)?.targetScore : 0);
const hasNext = computed(() => ELIM_CONFIG.levels.some(l => l.id === activeLevel.value + 1));

const loadStorage = () => {
  unlockedLevel.value = parseInt(localStorage.getItem(STORAGE.PROGRESS) || '1');
  highScore.value = parseInt(localStorage.getItem(STORAGE.HIGHSCORE) || '0');
  if (localStorage.getItem(STORAGE.SAVE)) showResumePrompt.value = true;
};

const initGame = (mode = 'level', levelId = 1) => {
  activeMode.value = mode;
  activeLevel.value = levelId;
  score.value = 0;
  localState.value = 'playing';
  showResumePrompt.value = false;
  movesLeft.value = mode === 'level' ? ELIM_CONFIG.levels.find(l => l.id === levelId).moveLimit : 40;
  generateValidBoard();
  localStorage.removeItem(STORAGE.SAVE);
};

const generateValidBoard = () => {
  let newBoard = [];
  const size = ELIM_CONFIG.gridSize;
  for (let r = 0; r < size; r++) {
    newBoard[r] = [];
    for (let c = 0; c < size; c++) {
      let pool = [...ELIM_CONFIG.types];
      if (c >= 2 && newBoard[r][c - 1].id === newBoard[r][c - 2].id) pool = pool.filter(t => t.id !== newBoard[r][c - 1].id);
      if (r >= 2 && newBoard[r - 1][c].id === newBoard[r - 2][c].id) pool = pool.filter(t => t.id !== newBoard[r - 1][c].id);
      newBoard[r][c] = pool[Math.floor(Math.random() * pool.length)];
    }
  }
  board.value = newBoard;
};

const handleCellClick = async (r, c) => {
  if (isProcessing.value || localState.value !== 'playing') return;
  if (!selectedCell.value) { selectedCell.value = { r, c }; }
  else {
    const p1 = selectedCell.value; const p2 = { r, c };
    if ((Math.abs(p1.r - p2.r) + Math.abs(p1.c - p2.c)) === 1) await swapAndCheck(p1, p2);
    selectedCell.value = null;
  }
};

const swapAndCheck = async (p1, p2) => {
  isProcessing.value = true;
  swapData(p1, p2);
  let matches = findMatches();
  if (matches.length > 0) { movesLeft.value--; await processEliminations(); }
  else { await delay(300); swapData(p1, p2); }
  isProcessing.value = false;
  checkGameEnd();
};

const swapData = (p1, p2) => {
  const temp = board.value[p1.r][p1.c];
  board.value[p1.r][p1.c] = board.value[p2.r][p2.c];
  board.value[p2.r][p2.c] = temp;
};

const findMatches = () => {
  const size = ELIM_CONFIG.gridSize;
  let matches = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size - 2; c++) {
      const id = board.value[r][c]?.id;
      if (id && board.value[r][c + 1]?.id === id && board.value[r][c + 2]?.id === id) matches.push({ r, c }, { r, c: c + 1 }, { r, c: c + 2 });
    }
  }
  for (let c = 0; c < size; c++) {
    for (let r = 0; r < size - 2; r++) {
      const id = board.value[r][c]?.id;
      if (id && board.value[r + 1][c]?.id === id && board.value[r + 2][c]?.id === id) matches.push({ r, c }, { r: r + 1, c }, { r: r + 2, c });
    }
  }
  return Array.from(new Set(matches.map(m => `${m.r},${m.c}`))).map(s => { const [r, c] = s.split(',').map(Number); return { r, c }; });
};

const processEliminations = async () => {
  let matches = findMatches();
  if (matches.length === 0) { saveGame(); return; }
  matches.forEach(m => board.value[m.r][m.c] = null);
  score.value += matches.length * ELIM_CONFIG.scorePerTile;
  await delay(300); dropTiles(); await delay(300); fillEmpty(); await delay(300);
  await processEliminations();
};

const dropTiles = () => {
  const size = ELIM_CONFIG.gridSize;
  for (let c = 0; c < size; c++) {
    let emptyRow = size - 1;
    for (let r = size - 1; r >= 0; r--) {
      if (board.value[r][c] !== null) {
        const temp = board.value[r][c]; board.value[r][c] = null;
        board.value[emptyRow][c] = temp; emptyRow--;
      }
    }
  }
};

const fillEmpty = () => {
  const size = ELIM_CONFIG.gridSize;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!board.value[r][c]) board.value[r][c] = ELIM_CONFIG.types[Math.floor(Math.random() * ELIM_CONFIG.types.length)];
    }
  }
};

const checkGameEnd = () => {
  if (activeMode.value === 'level') {
    if (score.value >= levelGoal.value) {
      localState.value = 'win';
      if (activeLevel.value >= unlockedLevel.value) { unlockedLevel.value = activeLevel.value + 1; localStorage.setItem(STORAGE.PROGRESS, unlockedLevel.value); }
      localStorage.removeItem(STORAGE.SAVE);
    } else if (movesLeft.value <= 0) { localState.value = 'gameOver'; localStorage.removeItem(STORAGE.SAVE); }
  } else {
    if (score.value > highScore.value) { highScore.value = score.value; localStorage.setItem(STORAGE.HIGHSCORE, highScore.value); }
  }
};

const saveGame = () => {
  const data = { board: board.value, score: score.value, movesLeft: movesLeft.value, activeLevel: activeLevel.value, activeMode: activeMode.value };
  localStorage.setItem(STORAGE.SAVE, JSON.stringify(data));
};

const resumeGame = () => {
  const data = JSON.parse(localStorage.getItem(STORAGE.SAVE));
  board.value = data.board; score.value = data.score; movesLeft.value = data.movesLeft;
  activeLevel.value = data.activeLevel; activeMode.value = data.activeMode;
  localState.value = 'playing'; showResumePrompt.value = false;
};

const discardAndNew = () => { localStorage.removeItem(STORAGE.SAVE); showResumePrompt.value = false; localState.value = 'selectMode'; };

const confirmExit = () => { if (confirm("确定要放弃本局并返回菜单吗？进度将自动保存。")) localState.value = 'selectMode'; };

const nextLevel = () => initGame('level', activeLevel.value + 1);
const isSelected = (r, c) => selectedCell.value?.r === r && selectedCell.value?.c === c;
const delay = (ms) => new Promise(res => setTimeout(res, ms));

onMounted(loadStorage);
</script>

<style scoped>
/* 全局深色渐变背景 */
.elim-container {
  width: 100vw;
  height: 100dvh;
  background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  touch-action: none;
  color: white;
}

/* HUD 样式 */
.hud {
  position: absolute;
  top: 15px;
  left: 0;
  right: 0;
  padding: 0 15px;
  z-index: 20;
}

.hud-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(30, 41, 59, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 10px 15px;
  height: 55px;
}

.label {
  font-size: 9px;
  color: #94a3b8;
  font-weight: 800;
  letter-spacing: 1px;
}

.value-text {
  font-size: 20px;
  font-weight: bold;
  color: #f8fafc;
}

.current-score {
  font-size: 22px;
  font-weight: 900;
  color: #38bdf8;
}

.target-score {
  color: #64748b;
  font-size: 14px;
}

.quit-btn {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: bold;
}

/* 棋盘 */
.board-wrapper {
  margin-top: 112px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
}

.board {
  position: relative;
  width: 88vw;
  height: 88vw;
  max-width: 400px;
  max-height: 400px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.row {
  display: flex;
  justify-content: space-between;
  height: 13.5%;
}

.cell {
  width: 13.5%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cell.selected {
  background: rgba(56, 189, 248, 0.3);
  border: 2px solid #38bdf8;
  transform: scale(1.05);
}

.tile {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 7vw;
  border-radius: 8px;
}

/* 弹窗遮罩 */
.game-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal-card {
  width: 65%;
  max-width: 380px;
  background: rgba(30, 41, 59, 0.85);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 32px;
  padding: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
}

/* 模式选择样式 */
.game-logo {
  font-size: 32px;
  font-weight: 900;
  color: #38bdf8;
  margin-bottom: 25px;
  text-align: center;
}

.mode-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.mode-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  cursor: pointer;
  transition: 0.2s;
}

.mode-item:active {
  transform: scale(0.98);
  background: rgba(255, 255, 255, 0.1);
}

.mode-icon {
  font-size: 24px;
}

.mode-info {
  flex: 1;
}

.mode-info h3 {
  margin: 0;
  font-size: 17px;
  color: #f1f5f9;
}

.mode-info p {
  margin: 0;
  font-size: 11px;
  color: #94a3b8;
}

.mode-arrow {
  color: #475569;
  font-weight: bold;
}

/* 关卡列表 (List Style) */
.modal-title {
  font-size: 22px;
  margin-bottom: 15px;
  text-align: center;
  color: #f1f5f9;
}

.level-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 350px;
  overflow-y: auto;
  padding-right: 5px;
  margin-bottom: 15px;
}

/* 滚动条美化 */
.level-list::-webkit-scrollbar {
  width: 4px;
}

.level-list::-webkit-scrollbar-thumb {
  background: rgba(56, 189, 248, 0.3);
  border-radius: 2px;
}

.level-row {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  cursor: pointer;
  transition: 0.2s;
}

.level-row:active:not(.locked) {
  background: rgba(56, 189, 248, 0.15);
  border-color: #38bdf8;
}

.level-row.locked {
  opacity: 0.4;
  cursor: not-allowed;
  filter: grayscale(0.8);
}

.lv-badge {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border-radius: 50%;
  font-weight: bold;
}

.lv-main {
  flex: 1;
  text-align: left;
}

.lv-main h4 {
  margin: 0;
  font-size: 15px;
  color: #f1f5f9;
}

.lv-main p {
  margin: 0;
  font-size: 11px;
  color: #64748b;
}

.lv-play-tag {
  font-size: 11px;
  background: #38bdf8;
  color: white;
  padding: 2px 8px;
  border-radius: 8px;
}

/* 结算与通用按钮 */
.text-win {
  color: #4ade80;
  font-size: 26px;
  text-align: center;
}

.text-lose {
  color: #f87171;
  font-size: 26px;
  text-align: center;
}

.result-stats {
  margin: 15px 0;
  padding: 15px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  text-align: center;
}

.btn-group-vertical {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

button {
  border: none;
  padding: 14px;
  border-radius: 16px;
  font-weight: bold;
  font-size: 15px;
  cursor: pointer;
  transition: 0.2s;
}

.primary-btn {
  background: #38bdf8;
  color: white;
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
}

.success-btn {
  background: #10b981;
  color: white;
}

.text-btn {
  background: none;
  color: #64748b;
  font-size: 13px;
  padding-top: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* 动画效果 */
.pop-enter-active {
  animation: pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes pop-in {
  0% {
    transform: scale(0);
  }

  100% {
    transform: scale(1);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>