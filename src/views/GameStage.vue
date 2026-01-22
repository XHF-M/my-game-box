<template>
  <div class="game-stage">
    <!-- 根据 store 中的 currentGame 动态渲染组件 -->
    <PlaneWars
      v-if="store.currentGame === 'PlaneWars'"
      :mode="store.gameMode"
      :currentLevel="store.currentLevel"
      @back="store.backToHall"
    />

    <Game2048
      v-else-if="store.currentGame === 'Game2048'"
      @back="store.backToHall"
    />

    <EliminationMain
      v-else-if="store.currentGame === 'Elimination'"
      @back="store.backToHall"
    />

    <div v-else class="error">
      游戏加载失败
      <button @click="store.backToHall">返回</button>
    </div>
  </div>
</template>

<script setup>
import { useGameStore } from '@/store/gameStore';
import PlaneWars from '@/apps/PlaneWars/components/PlaneWars.vue';
import Game2048 from '@/apps/Game2048/components/Game2048Main.vue';
import EliminationMain from '@/apps/Elimination/components/EliminationMain.vue'

const store = useGameStore();
</script>

<style scoped>
.game-stage {
  width: 100vw;
  height: 100vh;
  background: #000;
  overflow: hidden;
}
</style>