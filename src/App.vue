<template>
  <Home v-if="!store.currentGame" />
  <GameStage v-else />
</template>

<script setup>
import Home from './views/Home.vue';
import GameStage from './views/GameStage.vue';
import { useGameStore } from './store/gameStore';
const store = useGameStore();
</script>

<style>
/* 全局适配：消除所有边距，防止 iOS 橡皮筋回弹 */
:root {
  --primary: #38bdf8;
  --bg: #0f172a;
}

body, html, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: fixed; /* 核心：防止iOS下拉刷新和乱动 */
  background: var(--bg);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.app-shell {
  width: 100%;
  height: 100%;
  color: white;
}

/* 大厅样式 */
.home-screen {
  padding: env(safe-area-inset-top) 20px env(safe-area-inset-bottom);
  display: flex;
  flex-direction: column;
}

header { padding: 40px 0; }
header h1 { font-size: 2rem; margin: 0; }
header p { opacity: 0.6; }

</style>