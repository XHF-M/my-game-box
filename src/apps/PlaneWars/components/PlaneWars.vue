<template>
  <div class="game-sub-container">
    <canvas
      ref="canvasRef"
      @touchstart="handleTouchStart"
      @touchmove.prevent="handleTouchMove"
    ></canvas>

    <!-- HUD: 游戏进行时或暂停时的界面 -->
    <div v-if="localState === 'playing' || localState === 'paused'" class="hud">
      <div class="hud-content">
        <!-- 左侧：任务信息 -->
        <div class="hud-section left">
          <div class="label">{{ activeMode === 'level' ? 'MISSION' : 'MODE' }}</div>
          <div class="value-text">{{ activeMode === 'level' ? levelConfig.name : 'INFINITE' }}</div>
        </div>

        <!-- 中间：分数显示 (应用 scoreStatusClass) -->
        <div class="hud-section center">
          <div class="label">SCORE</div>
          <div class="score-display">
            <span class="current-score" :class="scoreStatusClass">{{ score }}</span>
            <span class="target-divider" v-if="activeMode === 'level'">/</span>
            <span class="target-score" v-if="activeMode === 'level'">{{ levelConfig.targetScore }}</span>
          </div>
        </div>

        <!-- 右侧：暂停控制按钮 -->
        <div class="hud-section right">
          <button class="pause-btn" @click.stop="togglePause">
            <span :class="{ 'pause-icon': localState === 'playing', 'play-icon': localState === 'paused' }">
              {{ localState === 'playing' ? '‖' : '▶' }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- 菜单/遮罩层 -->
    <div v-if="localState !== 'playing'" class="game-overlay">
      <div class="glass-panel">

        <!-- 暂停状态菜单 -->
        <div v-if="localState === 'paused'">
          <h2 class="menu-title">作战暂停</h2>
          <div class="action-buttons">
            <button class="primary-btn" @click="togglePause">继续战斗</button>
            <button class="back-btn" @click="confirmQuit">结束当前游戏</button>
          </div>
        </div>

        <!-- 1. 模式选择 -->
        <div v-if="localState === 'selectMode'">
          <h1 class="main-title">星际战机</h1>
          <div class="menu-grid">
            <div class="menu-card" @click="localState = 'selectLevel'">
              <h3>🚀 战役模式</h3>
              <p>进度: {{ unlockedLevel }} / {{ PLANE_CONFIG.levels.length }}</p>
            </div>
            <div class="menu-card infinite" @click="prepareGame('infinite')">
              <h3>⚡ 无限模式</h3>
              <p>最高分: <span class="gold-text">{{ highScore }}</span></p>
            </div>
          </div>
          <button class="back-btn" @click="$emit('back')">退出大厅</button>
        </div>

        <!-- 2. 关卡选择 -->
        <div v-if="localState === 'selectLevel'">
          <h2>选择关卡</h2>
          <div class="level-list">
            <div v-for="lv in PLANE_CONFIG.levels" :key="lv.id" class="level-item"
              :class="{ 'locked': lv.id > unlockedLevel }"
              @click="lv.id <= unlockedLevel ? prepareGame('level', lv.id) : null">
              <div class="lv-id">
                <span v-if="lv.id <= unlockedLevel">{{ lv.id }}</span>
                <span v-else>🔒</span>
              </div>
              <div class="lv-info">
                <h4>{{ lv.name }}</h4>
                <p v-if="lv.id <= unlockedLevel">目标: {{ lv.targetScore }} 分</p>
                <p v-else class="locked-text">需通关第 {{ lv.id - 1 }} 关解锁</p>
              </div>
            </div>
          </div>
          <button class="back-btn" @click="localState = 'selectMode'">返回</button>
        </div>

        <!-- 3. 结算 (胜利/失败) -->
        <div v-if="['win', 'gameOver'].includes(localState)">
          <h2 :class="localState === 'win' ? 'text-win' : 'text-lose'">
            {{ localState === 'win' ? '任务完成!' : '通讯中断' }}
          </h2>
          <div class="result-score">最终得分: {{ score }}</div>

          <div class="action-buttons">
            <button class="primary-btn" @click="prepareGame(activeMode, activeLevel)">
              {{ localState === 'win' ? '重玩本关' : '再次尝试' }}
            </button>
            <button v-if="localState === 'win' && hasNext" class="success-btn" @click="nextLevel">
              下一关
            </button>
            <button class="back-btn" @click="localState = 'selectMode'">返回菜单</button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { PLANE_CONFIG } from '../config';

const emit = defineEmits(['back']);

// --- 状态变量 ---
const canvasRef = ref(null);
const localState = ref('selectMode'); // selectMode, selectLevel, playing, paused, win, gameOver
const activeMode = ref('level');
const activeLevel = ref(1);
const score = ref(0);
const currentDifficulty = ref(1);

// --- 游戏引擎变量 ---
let ctx, canvasW, canvasH, animationId;
let player = { x: 0, y: 0, w: 0, h: 0 };
let enemies = [], bullets = [], particles = [], stars = [];
let lastSpawn = 0, lastShoot = 0, startTime = 0;
let pauseStartTime = 0; // 用于暂停时间记录

// --- 拖拽状态变量 ---
let touchStartX = 0;
let touchStartY = 0;
let playerStartX = 0;
let playerStartY = 0;

// --- 计算属性 ---
const levelConfig = computed(() => {
  return PLANE_CONFIG.levels.find(l => l.id === activeLevel.value) || PLANE_CONFIG.levels[0];
});

const hasNext = computed(() => {
  return PLANE_CONFIG.levels.some(l => l.id === activeLevel.value + 1);
});

// 计算分数颜色状态
const scoreStatusClass = computed(() => {
  if (activeMode.value !== 'level') return '';
  const ratio = score.value / levelConfig.value.targetScore;
  if (ratio >= 0.9) return 'score-near-win';
  return '';
});

// --- 1. 定义存储键名 ---
const STORAGE_KEYS = {
  PROGRESS: 'plane_wars_unlocked_level',
  HIGHSCORE: 'plane_wars_highscore'
};

// --- 2. 响应式状态 ---
const unlockedLevel = ref(1); // 当前解锁到的最高关卡
const highScore = ref(0);     // 无限模式最高分

// --- 3. 持久化方法 ---
const loadGameData = () => {
  const savedProgress = localStorage.getItem(STORAGE_KEYS.PROGRESS);
  const savedHighScore = localStorage.getItem(STORAGE_KEYS.HIGHSCORE);

  if (savedProgress) unlockedLevel.value = parseInt(savedProgress);
  if (savedHighScore) highScore.value = parseInt(savedHighScore);
};

const saveProgress = (level) => {
  // 只有通关当前最高关卡时，才解锁下一关
  if (level >= unlockedLevel.value) {
    unlockedLevel.value = level + 1;
    localStorage.setItem(STORAGE_KEYS.PROGRESS, unlockedLevel.value.toString());
  }
};

const updateHighScore = (currentScore) => {
  if (currentScore > highScore.value) {
    highScore.value = currentScore;
    localStorage.setItem(STORAGE_KEYS.HIGHSCORE, highScore.value.toString());
  }
};

// --- 游戏控制 ---

// 切换暂停状态
const togglePause = () => {
  if (localState.value === 'playing') {
    localState.value = 'paused';
    pauseStartTime = Date.now();
    if (animationId) cancelAnimationFrame(animationId); // 停止动画，省电且防止后台运行
  } else if (localState.value === 'paused') {
    // 恢复时的时间补偿逻辑
    const pauseDuration = Date.now() - pauseStartTime;
    lastSpawn += pauseDuration;
    lastShoot += pauseDuration;
    startTime += pauseDuration;

    localState.value = 'playing';
    gameLoop(); // 重新启动循环
  }
};

// 退出当前游戏
const confirmQuit = () => {
  if (confirm("确定要放弃当前的战斗任务吗？")) {
    localState.value = 'selectMode';
    if (animationId) cancelAnimationFrame(animationId);
  }
};

const prepareGame = (mode, level = 1) => {
  activeMode.value = mode;
  activeLevel.value = level;
  initCanvas();

  stars = Array.from({ length: 60 }, () => ({
    x: Math.random() * canvasW,
    y: Math.random() * canvasH,
    s: Math.random() * 2 + 0.5,
    speed: Math.random() * 1 + 0.5
  }));

  start();
};

const nextLevel = () => {
  activeLevel.value++;
  start();
};

const start = () => {
  score.value = 0;
  enemies = [];
  bullets = [];
  particles = [];
  startTime = Date.now();
  currentDifficulty.value = 1;

  if (canvasW && canvasH) {
    player.x = canvasW / 2 - player.w / 2;
    player.y = canvasH - player.h - 100;
  }

  localState.value = 'playing';
  gameLoop();
};

const initCanvas = () => {
  if (!canvasRef.value) return;
  canvasW = window.innerWidth;
  canvasH = window.innerHeight;
  canvasRef.value.width = canvasW;
  canvasRef.value.height = canvasH;
  ctx = canvasRef.value.getContext('2d');

  player.w = canvasW * 0.14;
  player.h = player.w;
};

// --- 绘图系统 ---

const drawStars = () => {
  ctx.fillStyle = '#ffffff';
  stars.forEach(s => {
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2);
    ctx.fill();
    if (localState.value === 'playing') {
      s.y += s.speed * (activeMode.value === 'infinite' ? currentDifficulty.value : 1);
      if (s.y > canvasH) { s.y = 0; s.x = Math.random() * canvasW; }
    }
  });
  ctx.globalAlpha = 1.0;
};

const drawPlayer = () => {
  ctx.save();
  ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
  const flameH = player.h * 0.6 + Math.random() * 10;
  const grad = ctx.createLinearGradient(0, player.h / 3, 0, player.h / 3 + flameH);
  grad.addColorStop(0, 'rgba(56, 189, 248, 0.8)');
  grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-player.w * 0.15, player.h * 0.3);
  ctx.lineTo(0, player.h * 0.3 + flameH);
  ctx.lineTo(player.w * 0.15, player.h * 0.3);
  ctx.fill();
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#38bdf8';
  ctx.fillStyle = '#0ea5e9';
  ctx.beginPath();
  ctx.moveTo(0, -player.h / 2);
  ctx.lineTo(player.w / 2, player.h / 2);
  ctx.lineTo(0, player.h / 3);
  ctx.lineTo(-player.w / 2, player.h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const drawEnemy = (e) => {
  ctx.save();
  ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#f87171';
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(0, e.h / 2);
  ctx.lineTo(-e.w / 2, -e.h / 2);
  ctx.lineTo(e.w / 2, -e.h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const drawBullets = () => {
  ctx.fillStyle = '#facc15';
  bullets.forEach(b => {
    ctx.beginPath();
    ctx.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  });
};

const drawParticles = () => {
  particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });
  ctx.globalAlpha = 1.0;
};

const createExplosion = (x, y) => {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
      life: 1.0, size: Math.random() * 3 + 2,
      color: Math.random() > 0.5 ? '#f87171' : '#fca5a5'
    });
  }
};

const update = () => {
  const now = Date.now();
  let spawnInterval = PLANE_CONFIG.spawnInterval;
  let speedMultiplier = 1;

  // 1. 难度与生成间隔计算
  if (activeMode.value === 'level') {
    speedMultiplier = levelConfig.value.speedMod;
    spawnInterval *= levelConfig.value.spawnMod;
  } else {
    currentDifficulty.value = 1 + (now - startTime) * PLANE_CONFIG.infiniteGrowth;
    speedMultiplier = currentDifficulty.value;
    spawnInterval /= (currentDifficulty.value * 0.6 + 0.4);
  }

  // 2. 自动射击逻辑
  if (now - lastShoot > 200) {
    bullets.push({ x: player.x + player.w / 2 - 3, y: player.y - 10, w: 6, h: 16 });
    lastShoot = now;
  }

  // 3. 生成敌人逻辑
  if (now - lastSpawn > spawnInterval) {
    const size = 40 + Math.random() * 10;
    enemies.push({
      x: Math.random() * (canvasW - size),
      y: -60,
      w: size,
      h: size,
      speed: canvasH * PLANE_CONFIG.baseEnemySpeed * speedMultiplier * (0.8 + Math.random() * 0.4)
    });
    lastSpawn = now;
  }

  // 4. 更新子弹位置
  const bSpeed = canvasH * PLANE_CONFIG.baseBulletSpeed;
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].y -= bSpeed;
    if (bullets[i].y < -20) bullets.splice(i, 1);
  }

  // 5. 更新敌人位置 & 碰撞检测 (hitPlayer 在这里定义)
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.y += e.speed;

    // --- 在这里定义 hitPlayer ---
    const hitPlayer = isColliding(player, e);

    if (hitPlayer) {
      // 玩家被撞
      createExplosion(player.x + player.w / 2, player.y + player.h / 2);

      // 如果是无限模式，记录最高分
      if (activeMode.value === 'infinite') {
        updateHighScore(score.value);
      }

      localState.value = 'gameOver';
      return; // 立即跳出更新逻辑
    }

    let enemyDestroyed = false;
    for (let j = bullets.length - 1; j >= 0; j--) {
      if (isColliding(bullets[j], e)) {
        createExplosion(e.x + e.w / 2, e.y + e.h / 2);
        bullets.splice(j, 1);
        enemyDestroyed = true;
        score.value += 5; // 击毁得分

        // 检查关卡模式是否胜利
        if (activeMode.value === 'level' && score.value >= levelConfig.value.targetScore) {
          saveProgress(activeLevel.value); // 解锁下一关
          localState.value = 'win';
        }

        // 如果是无限模式，实时检查最高分
        if (activeMode.value === 'infinite') {
          updateHighScore(score.value);
        }
        break;
      }
    }

    if (enemyDestroyed) {
      enemies.splice(i, 1);
      continue;
    }

    if (e.y > canvasH + 50) enemies.splice(i, 1);
  }

  // 6. 更新爆炸粒子
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.03;
    if (p.life <= 0) particles.splice(i, 1);
  }
};

const isColliding = (r1, r2) => {
  const padding = 5;
  return (
    r1.x + padding < r2.x + r2.w - padding &&
    r1.x + r1.w - padding > r2.x + padding &&
    r1.y + padding < r2.y + r2.h - padding &&
    r1.y + r1.h - padding > r2.y + padding
  );
};

const draw = () => {
  if (!ctx) return;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvasW, canvasH);
  drawStars();
  drawPlayer();
  drawBullets();
  enemies.forEach(drawEnemy);
  drawParticles();
};

const gameLoop = () => {
  if (localState.value !== 'playing') return;
  update();
  draw();
  animationId = requestAnimationFrame(gameLoop);
};

// --- 1. 手指按下时：记录起始点 ---
const handleTouchStart = (e) => {
  if (localState.value !== 'playing') return;

  const touch = e.touches[0];
  // 记录手指点击的初始坐标
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;

  // 记录战机当前的坐标
  playerStartX = player.x;
  playerStartY = player.y;
};

// --- 2. 手指滑动时：计算位移并移动 ---
const handleTouchMove = (e) => {
  if (localState.value !== 'playing') return;

  const touch = e.touches[0];

  // 计算手指移动的距离 (当前位置 - 初始位置)
  const deltaX = touch.clientX - touchStartX;
  const deltaY = touch.clientY - touchStartY;

  // 将位移累加到战机的初始坐标上
  let newX = playerStartX + deltaX;
  let newY = playerStartY + deltaY;

  // --- 边界限制 (防止战机飞出屏幕) ---
  if (newX < 0) newX = 0;
  if (newX > canvasW - player.w) newX = canvasW - player.w;
  if (newY < 0) newY = 0;
  if (newY > canvasH - player.h) newY = canvasH - player.h;

  player.x = newX;
  player.y = newY;
};

onMounted(() => {
  loadGameData();

  initCanvas();
  window.addEventListener('resize', initCanvas);
});
onUnmounted(() => { if (animationId) cancelAnimationFrame(animationId); window.removeEventListener('resize', initCanvas); });
</script>

<style scoped>
.game-sub-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: #0f172a;
  overflow: hidden;
  touch-action: none;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

canvas {
  display: block;
}

/* HUD 样式 */
.hud {
  position: absolute;
  top: 15px;
  left: 0;
  right: 0;
  padding: 0 15px;
  z-index: 20;
  /* 必须高于 game-overlay 的 10，否则暂停后点不到按钮 */
  pointer-events: none;
  /* 让大部分区域点击穿透到画布 */
}

.hud-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 12px;
  padding: 8px 15px;
  height: 50px;
  pointer-events: none;
  /* 继续穿透 */
}

.pause-btn {
  /* 基础样式 */
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  font-size: 18px;
  cursor: pointer;

  /* 核心：重新开启点击响应 */
  pointer-events: auto;

  /* 居中对齐修复 */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.2s;
}

.pause-btn:active {
  transform: scale(0.9);
  background: rgba(255, 255, 255, 0.3);
}

/* 暂停/播放图标微调 */
.pause-icon {
  transform: translateY(-1px);
  letter-spacing: -2px;
  /* 让两条杠靠拢一点 */
  font-weight: bold;
}

.play-icon {
  margin-left: 2px;
  /* 三角形视觉修正 */
}

.hud-section {
  display: flex;
  flex-direction: column;
}

.hud-section.center {
  align-items: center;
}

.hud-section.right {
  align-items: flex-end;
}

.label {
  font-size: 9px;
  color: #94a3b8;
  font-weight: 800;
  letter-spacing: 1px;
  margin-bottom: 2px;
}

.value-text {
  font-size: 14px;
  color: #f8fafc;
  font-weight: bold;
}

.score-display {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.current-score {
  font-size: 22px;
  font-weight: 900;
  color: #38bdf8;
  font-family: 'Monaco', monospace;
  text-shadow: 0 0 10px rgba(56, 189, 248, 0.5);
}

.score-near-win {
  color: #4ade80 !important;
  animation: pulse 1s infinite;
}

.target-divider {
  color: #64748b;
  font-size: 14px;
}

.target-score {
  color: #94a3b8;
  font-size: 14px;
  font-weight: bold;
}

.pause-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
}

/* 菜单遮罩层 */
.game-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  /* 几何居中 */
  justify-content: center;
  z-index: 10;
}

.glass-panel {
  width: 90%;
  max-width: 400px;
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 30px rgba(56, 189, 248, 0.2);
  backdrop-filter: blur(12px);
  border-radius: 24px;
  padding: 30px;
  text-align: center;
  color: white;
  transform: translateY(-8%);
}

.menu-title {
  margin-bottom: 25px;
  color: #38bdf8;
}

.main-title {
  font-size: 32px;
  margin-bottom: 30px;
  background: linear-gradient(to right, #38bdf8, #818cf8);
  -webkit-background-clip: text;
  color: transparent;
  font-weight: 900;
}

.menu-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 25px;
}

.menu-card {
  background: rgba(255, 255, 255, 0.05);
  padding: 20px 10px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
}

.menu-card h3 {
  font-size: 16px;
  margin: 0 0 5px;
}

.menu-card p {
  font-size: 11px;
  color: #94a3b8;
  margin: 0;
}

.level-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 25px;
  max-height: 250px;
  overflow-y: auto;
}

/* 自定义关卡列表滚动条 */
.level-list::-webkit-scrollbar {
  width: 4px;
}
.level-list::-webkit-scrollbar-thumb {
  background: rgba(56, 189, 248, 0.3);
  border-radius: 2px;
}

.level-item {
  display: flex;
  align-items: center;
  gap: 15px;
  text-align: left;
  background: rgba(255, 255, 255, 0.05);
  padding: 12px;
  border-radius: 12px;
}

/* 锁定状态样式 */
.level-item.locked {
  opacity: 0.5;
  filter: grayscale(1);
  cursor: not-allowed;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.2);
}

.locked-text {
  color: #ef4444 !important;
  font-size: 10px;
}

/* 最高分金光效果 */
.gold-text {
  color: #facc15;
  font-weight: bold;
  text-shadow: 0 0 5px rgba(250, 204, 21, 0.5);
}

.lv-id {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(56, 189, 248, 0.1);
  border-radius: 50%;
  font-size: 18px;
  font-weight: bold;
  color: #38bdf8;
}

.locked .lv-id {
  background: rgba(255, 255, 255, 0.1);
  color: #64748b;
}

.lv-info h4 {
  margin: 0;
  font-size: 15px;
}

.lv-info p {
  margin: 0;
  font-size: 11px;
  color: #94a3b8;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

button {
  width: 100%;
  border: none;
  padding: 14px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.primary-btn {
  background: #38bdf8;
  color: white;
}

.success-btn {
  background: #22c55e;
  color: white;
}

.back-btn {
  background: transparent;
  color: #94a3b8;
  border: 1px solid #334155;
}

.text-win {
  color: #4ade80;
}

.text-lose {
  color: #f87171;
}

.result-score {
  font-size: 20px;
  margin-bottom: 30px;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }

  100% {
    opacity: 1;
  }
}
</style>