<template>
  <div class="home-container">
    <h1>游戏大厅</h1>
    <div class="game-list">
      <div class="game-card" @click="playPlaneWars">
        <div class="icon">✈️</div>
        <h3>飞机大战</h3>
        <p>经典空战，挑战极限</p>
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
</script>

<style scoped>
.home-container {
  padding: 20px;
  text-align: center;
  color: white;
}

.game-list {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-top: 40px;
}

.game-card {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 15px;
  cursor: pointer;
  transition: transform 0.2s;
  width: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.game-card:hover {
  transform: scale(1.05);
  background: rgba(255, 255, 255, 0.2);
}

.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon {
  font-size: 40px;
}
</style>