export const ELIM_CONFIG = {
  gridSize: 7,
  types: [
    { id: 1, icon: '🍎', color: '#fee2e2' },
    { id: 2, icon: '🍇', color: '#f5f3ff' },
    { id: 3, icon: '🍊', color: '#fff7ed' },
    { id: 4, icon: '🍋', color: '#fefce8' },
    { id: 5, icon: '🍉', color: '#f0fdf4' },
    { id: 6, icon: '🍓', color: '#fff1f2' }
  ],
  scorePerTile: 10,

  // 关卡配置
  levels: [
    { id: 1, name: "新手入门", targetScore: 500, moveLimit: 30, desc: "熟悉消除逻辑" },
    { id: 2, name: "渐入佳境", targetScore: 800, moveLimit: 25, desc: "步数稍微有些紧凑了" },
    { id: 3, name: "连消达人", targetScore: 1200, moveLimit: 25, desc: "尝试制造更多连消" },
    { id: 4, name: "步步为营", targetScore: 1000, moveLimit: 15, desc: "每一步都要深思熟虑" },
    { id: 5, name: "速度挑战", targetScore: 1500, moveLimit: 20, desc: "分数压力极大" },
    { id: 6, name: "智力巅峰", targetScore: 2000, moveLimit: 18, desc: "只有消消乐大师能通关" }
  ]
};