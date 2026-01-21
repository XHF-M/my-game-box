<template>
  <div class="game-stage">
    <!-- 根据 store 中的 currentGame 动态渲染组件 -->
    <PlaneWars
      v-if="store.currentGame === 'PlaneWars'"
      :mode="store.gameMode"
      :currentLevel="store.currentLevel"
      @back="store.backToHall"
    />

    <div v-else class="error">
      游戏加载失败
      <button @click="store.backToHall">返回</button>
    </div>
  </div>
</template>

<script setup>
import { useGameStore } from '../store/gameStore';
import PlaneWars from '../apps/PlaneWars/components/PlaneWars.vue'; // 假设你的组件名
const store = useGameStore();
</script>

<style scoped>
.game-stage { width: 100vw; height: 100vh; background: #000; overflow: hidden; }
</style>