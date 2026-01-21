<template>
  <div class="home-container">
    <h1>游戏大厅</h1>
    <div class="game-list">
      <div class="game-card" @click="playPlaneWars">
        <div class="icon">✈️</div>
        <h3>飞机大战</h3>
        <p>经典空战，挑战极限</p>
      </div>
      <div class="game-card" @click="playGame2048">
        <div class="icon">🔢</div>
        <h3>2048</h3>
        <p>经典数字游戏，挑战你的数学能力</p>
      </div>
      <div class="game-card locked">
        <div class="icon">🧩</div>
        <h3>消消乐</h3>
        <p>即将到来...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useGameStore } from '../store/gameStore';
const store = useGameStore();

const playPlaneWars = () => {
  store.selectGame('PlaneWars');
};

const playGame2048 = () => {
  store.selectGame('Game2048');
};
</script>

<style scoped>
.home-container {
  padding: 20px;
  text-align: center;
  color: white;
}

.game-list {
  display: grid;
  /* 核心：分成2列，每列占1份等分 (1fr) */
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;            /* 卡片之间的间距 */
  padding: 20px;        /* 容器内边距 */
  max-width: 500px;     /* 根据需要限制最大宽度 */
  margin: 40px auto 0;  /* 居中显示 */
}

.game-card {
  aspect-ratio: 1 / 1;
  padding: 10px; /* 减小内边距 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center; /* 居中分布 */
  overflow: hidden; /* 防止溢出内容显示 */
  background: #1e293b;
  background: #1e293b;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.05);
}

.game-card .icon {
  font-size: 24px; /* 缩小图标 */
  margin-bottom: 5px;
}

.game-card h3 {
  font-size: 14px; /* 缩小标题 */
  margin: 5px 0;
}

.game-card p {
  font-size: 11px; /* 描述文字一定要小 */
  line-height: 1.2;
  /* 关键：限制描述文字只显示两行，多出的打省略号 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  opacity: 0.7;
}

.game-card:active {
  transform: scale(0.95); /* 手机端点击反馈 */
  background: rgba(255, 255, 255, 0.2);
}

.locked {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>