import { defineStore } from 'pinia';

export const useGameStore = defineStore('game', {
  state: () => ({
    currentGame: null, // 'PlaneWars' | 'Game2048' | 'Elimination'
  }),
  actions: {
    selectGame(gameId) {
      this.currentGame = gameId;
    },
    backToHall() {
      this.currentGame = null;
    }
  }
});