<template>
  <div class="game-2048-container">

    <!-- 顶部状态栏 -->
    <div class="header">
      <div class="title-row">
        <h1 class="logo">2048</h1>
        <div class="scores-container">
          <div class="score-box">
            <span class="label">SCORE</span>
            <span class="value">{{ score }}</span>
          </div>
          <div class="score-box best">
            <span class="label">BEST</span>
            <span class="value">{{ highScore }}</span>
          </div>
        </div>
      </div>
      <div class="action-row">
        <p class="subtitle">合并数字，直达 2048！</p>
        <button class="reset-btn" @click="initGame">新游戏</button>
      </div>
    </div>

    <!-- 游戏棋盘：事件仅绑定在这里 -->
    <div class="grid-container" @touchstart="handleTouchStart" @touchend="handleTouchEnd">

      <div v-for="(row, rIdx) in grid" :key="'row-' + rIdx" class="grid-row">
        <div v-for="(cell, cIdx) in row" :key="'cell-' + cIdx" class="grid-cell"
          :style="{ backgroundColor: getTileColor(cell) }">

          <transition name="tile-scale">
            <span v-if="cell !== 0" :key="rIdx + '-' + cIdx + '-' + cell" class="tile-number" :class="getTileClass(cell)">
              {{ cell }}
            </span>
          </transition>
        </div>
      </div>

      <!-- 新增：恢复进度询问弹窗 -->
      <transition name="fade">
        <div v-if="showResumePrompt" class="overlay resume-overlay">
          <h3>继续上一局？</h3>
          <p>检测到上次未完成的进度</p>
          <div class="overlay-btns">
            <button class="primary-btn" @click="resumeGame">继续游戏</button>
            <button class="secondary-btn" @click="initGame">重新开始</button>
          </div>
        </div>
      </transition>

      <!-- 游戏结束/成功遮罩 -->
      <transition name="fade">
        <div v-if="localState === 'win' || localState === 'gameOver'" class="overlay">
          <h2 :class="localState">{{ localState === 'win' ? '你赢了!' : '游戏结束!' }}</h2>
          <div class="overlay-btns">
            <button class="primary-btn" @click="initGame">重试</button>
            <button class="secondary-btn" @click="$emit('back')">大厅</button>
          </div>
        </div>
      </transition>
    </div>

    <!-- 底部操作说明 -->
    <div class="footer-hint">
      <button class="exit-btn" @click="$emit('back')">返回大厅</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { G2048_CONFIG } from '../config';

const emit = defineEmits(['back']);

// --- 状态变量 ---
const grid = ref([]);
const score = ref(0);
const highScore = ref(parseInt(localStorage.getItem('2048_highscore') || '0'));
const localState = ref('playing');

let startX = 0, startY = 0;

// --- 存档键名 ---
const SAVE_KEY = '2048_save_data';

// --- 状态变量 ---
const showResumePrompt = ref(false); // 是否显示“恢复游戏”询问弹窗

// --- 存档逻辑 ---

// 保存当前进度
const saveGame = () => {
  const data = {
    grid: grid.value,
    score: score.value,
    timestamp: Date.now()
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
};

// 恢复游戏
const resumeGame = () => {
  const savedData = localStorage.getItem(SAVE_KEY);
  if (savedData) {
    const data = JSON.parse(savedData);
    grid.value = data.grid;
    score.value = data.score;
    localState.value = 'playing';
    showResumePrompt.value = false;
  }
};

// 清除存档
const clearSave = () => {
  localStorage.removeItem(SAVE_KEY);
};

// --- 样式逻辑 ---
const getTileColor = (val) => G2048_CONFIG.colors[val] || (val > 2048 ? '#000' : '#cdc1b4');

const getTileClass = (val) => {
  return {
    'bright-text': val >= 8,     // 8 以上文字变白
    'small-text': val >= 100,    // 100 以上缩小
    'smaller-text': val >= 1000  // 1000 以上更小
  };
};

// --- 游戏逻辑 ---
const initGame = () => {
  grid.value = Array.from({ length: G2048_CONFIG.gridSize }, () =>
    Array(G2048_CONFIG.gridSize).fill(0)
  );
  score.value = 0;
  localState.value = 'playing';
  showResumePrompt.value = false;
  clearSave(); // 重新开始时清除旧存档
  addRandomTile();
  addRandomTile();
};

const addRandomTile = () => {
  const emptyCells = [];
  grid.value.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell === 0) emptyCells.push({ r, c });
    });
  });

  if (emptyCells.length > 0) {
    const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    grid.value[r][c] = G2048_CONFIG.randomRates[Math.floor(Math.random() * 10)];
  }
};

const handleTouchStart = (e) => {
  // 阻止默认行为防止页面滚动（仅限棋盘内）
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
};

const handleTouchEnd = (e) => {
  if (localState.value !== 'playing') return;

  const endX = e.changedTouches[0].clientX;
  const endY = e.changedTouches[0].clientY;

  const dx = endX - startX;
  const dy = endY - startY;

  // 必须滑动超过 20 像素才触发
  if (Math.abs(dx) > Math.abs(dy)) {
    if (Math.abs(dx) > 20) dx > 0 ? move('right') : move('left');
  } else {
    if (Math.abs(dy) > 20) dy > 0 ? move('down') : move('up');
  }
};

const move = (direction) => {
  const size = G2048_CONFIG.gridSize;
  const oldGrid = JSON.stringify(grid.value);

  if (direction === 'left' || direction === 'right') {
    for (let r = 0; r < size; r++) {
      let row = grid.value[r];
      if (direction === 'right') row.reverse();
      const processed = processLine(row);
      if (direction === 'right') processed.reverse();
      grid.value[r] = processed;
    }
  } else {
    for (let c = 0; c < size; c++) {
      let col = [];
      for (let r = 0; r < size; r++) col.push(grid.value[r][c]);
      if (direction === 'down') col.reverse();
      const processed = processLine(col);
      if (direction === 'down') processed.reverse();
      for (let r = 0; r < size; r++) grid.value[r][c] = processed[r];
    }
  }

  if (oldGrid !== JSON.stringify(grid.value)) {
    addRandomTile();
    saveGame(); // <--- 关键：移动并产生新块后立即保存
    checkGameOver();
  }
};

const processLine = (line) => {
  let nums = line.filter(x => x !== 0);
  for (let i = 0; i < nums.length - 1; i++) {
    if (nums[i] === nums[i + 1]) {
      nums[i] *= 2;
      score.value += nums[i];
      nums.splice(i + 1, 1);
      if (nums[i] === 2048) localState.value = 'win';
    }
  }
  while (nums.length < G2048_CONFIG.gridSize) nums.push(0);
  return nums;
};

const checkGameOver = () => {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid.value[r][c] === 0) return;
      const val = grid.value[r][c];
      if (r < 3 && val === grid.value[r + 1][c]) return;
      if (c < 3 && val === grid.value[r][c + 1]) return;
    }
  }
  localState.value = 'gameOver';
  if (score.value > highScore.value) {
    highScore.value = score.value;
    localStorage.setItem('2048_highscore', score.value.toString());
  }

  // 如果进入了 gameOver 或 win 状态
  if (localState.value !== 'playing') {
    clearSave(); // 游戏已经结束，不需要再恢复了
  }
};

onMounted(() => {
  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) {
    showResumePrompt.value = true;
  } else {
    initGame();
  }
});
</script>

<style scoped>
/* 使用 CSS 变量方便全局调整 */
:host {
  --bg-color: #faf8ef;
  --grid-bg: #bbada0;
  --cell-bg: rgba(238, 228, 218, 0.35);
  --text-dark: #776e65;
  --text-light: #f9f6f2;
}

.game-2048-container {
  width: 100vw;
  height: 100vh;
  background: #faf8ef;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 5vh;
  touch-action: none;
  /* 关键：禁止移动端默认下拉刷新 */
  box-sizing: border-box;
}

/* 头部适配 */
.header {
  width: 90vw;
  max-width: 400px;
  margin-bottom: 20px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 12vw;
  /* 响应式字体 */
  max-size: 60px;
  font-weight: bold;
  color: #776e65;
  margin: 0;
}

.scores-container {
  display: flex;
  gap: 8px;
}

.score-box {
  background: #bbada0;
  min-width: 60px;
  padding: 8px;
  border-radius: 4px;
  color: white;
  text-align: center;
}

.label {
  display: block;
  font-size: 10px;
  font-weight: bold;
  color: #eee4da;
}

.value {
  font-size: 16px;
  font-weight: bold;
}

.action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.subtitle {
  color: #776e65;
  font-weight: bold;
  margin: 0;
  font-size: 14px;
}

.reset-btn {
  background: #8f7a66;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: bold;
}

/* 棋盘适配：核心 */
.grid-container {
  position: relative;
  width: 90vw;
  /* 宽度占屏幕 90% */
  height: 90vw;
  /* 高度与宽度相等 */
  max-width: 400px;
  max-height: 400px;
  background: #bbada0;
  padding: 2vw;
  /* 内边距响应式 */
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
  touch-action: none;
  /* 确保事件只在这里生效 */
}

.grid-row {
  display: flex;
  justify-content: space-between;
  height: 22%;
  /* 预留间隙 */
}

.grid-cell {
  width: 22%;
  /* 4个方块 + 间隙 = 100% */
  height: 100%;
  background: rgba(238, 228, 218, 0.35);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

/* 数字样式 */
.tile-number {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 8vw;
  /* 响应式字体 */
  font-weight: bold;
  color: #776e65;
}

@media (min-width: 450px) {
  .tile-number {
    font-size: 32px;
  }
}

.bright-text {
  color: #f9f6f2;
}

.small-text {
  font-size: 6vw;
}

.smaller-text {
  font-size: 5vw;
}

/* 遮罩层 */
.overlay {
  position: absolute;
  inset: 0;
  background: rgba(238, 228, 218, 0.7);
  backdrop-filter: blur(2px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  z-index: 10;
}

.overlay h2 {
  font-size: 32px;
  margin-bottom: 20px;
}

/* 恢复进度遮罩的特殊样式 */
.resume-overlay {
  background: rgba(250, 248, 239, 0.95) !important; /* 不透明度高一点，更像独立弹窗 */
  backdrop-filter: blur(4px);
}

.resume-overlay h3 {
  color: #776e65;
  font-size: 24px;
  margin-bottom: 10px;
}

.resume-overlay p {
  color: #776e65;
  margin-bottom: 20px;
  font-size: 14px;
  opacity: 0.8;
}

/* 按钮样式微调 */
.overlay-btns {
  display: flex;
  flex-direction: column; /* 手机端竖排按钮更好点 */
  gap: 10px;
  width: 80%;
}

.overlay-btns button {
  margin: 0;
  width: 100%;
}

.gameOver {
  color: #776e65;
}

.win {
  color: #edc22e;
}

.primary-btn {
  background: #8f7a66;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
}

.secondary-btn {
  background: #bbada0;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  margin-left: 10px;
  font-weight: bold;
}

.footer-hint {
  margin-top: 30px;
}

.exit-btn {
  background: transparent;
  border: 1px solid #776e65;
  color: #776e65;
  padding: 8px 20px;
  border-radius: 20px;
}

/* 动画效果 */
.tile-scale-enter-active {
  animation: tile-pop 0.2s ease;
}

@keyframes tile-pop {
  0% {
    transform: scale(0);
    opacity: 0;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>