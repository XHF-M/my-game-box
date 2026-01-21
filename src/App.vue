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

.game-grid {
  display: grid;
  gap: 20px;
}

.game-card {
  background: #1e293b;
  padding: 20px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 20px;
  border: 1px solid rgba(255,255,255,0.05);
}

.game-card .icon { font-size: 40px; }
.game-card h3 { margin: 0; font-size: 1.2rem; }
.game-card span { font-size: 0.9rem; opacity: 0.5; }
.game-card.locked { opacity: 0.4; filter: grayscale(1); }

/* 游戏舞台 */
.game-stage {
  width: 100vw;
  height: 100vh;
}
</style>