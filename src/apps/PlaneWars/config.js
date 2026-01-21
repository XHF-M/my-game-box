export const PLANE_CONFIG = {
  baseEnemySpeed: 0.004,
  baseBulletSpeed: 0.015,
  spawnInterval: 1200,
  infiniteGrowth: 0.0001,

  levels: [
    // 第一阶段：教学期 (1-3关) - 重点是熟悉移动
    { id: 1, name: "星际起航", targetScore: 50, speedMod: 1.0, spawnMod: 1.2, desc: "新兵训练，敌机稀疏。" },
    { id: 2, name: "巡逻任务", targetScore: 80, speedMod: 1.1, spawnMod: 1.1, desc: "敌机速度略微提升。" },
    { id: 3, name: "初步交火", targetScore: 100, speedMod: 1.2, spawnMod: 1.0, desc: "标准战斗节奏。" },

    // 第二阶段：压力期 (4-6关) - 重点是满屏敌人的位移规划
    { id: 4, name: "密集阵列", targetScore: 150, speedMod: 1.2, spawnMod: 0.7, desc: "敌机数量大幅增加！" },
    { id: 5, name: "蜂群攻击", targetScore: 200, speedMod: 1.3, spawnMod: 0.5, desc: "满屏敌人，寻找间隙。" },
    { id: 6, name: "阻塞航道", targetScore: 250, speedMod: 1.4, spawnMod: 0.35, desc: "极致压制，生存挑战。" },

    // 第三阶段：极限期 (7-10关) - 重点是反应速度
    { id: 7, name: "迅雷突击", targetScore: 300, speedMod: 2.0, spawnMod: 0.7, desc: "敌机开始高速俯冲。" },
    { id: 8, name: "超音速拦截", targetScore: 350, speedMod: 2.5, spawnMod: 0.6, desc: "考验你的瞬间反应。" },
    { id: 9, name: "光速战场", targetScore: 400, speedMod: 3.2, spawnMod: 0.5, desc: "敌机速度接近子弹！" },
    { id: 10, name: "终极禁区", targetScore: 500, speedMod: 4.5, spawnMod: 0.4, desc: "只有王牌飞行员能幸存。" }
  ]
};