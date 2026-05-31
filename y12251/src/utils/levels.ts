import type { Level } from "@/types"

export const LEVELS: Level[] = [
  {
    id: "L01",
    name: "基础圆弧",
    description: "正电荷在垂直纸面向里的磁场中运动，判断洛伦兹力方向",
    difficulty: 1,
    energyLimit: 5000,
    initialAngle: 0,
    particle: { x: 100, y: 300, vx: 3, vy: 0, charge: 1, mass: 1, angle: 0 },
    boards: [
      { id: "B01", direction: "into", strength: 0.02, locked: false, arrivalOrder: 1, x: 200, y: 100, width: 400, height: 400 },
    ],
    bars: [
      { id: "C01", current: 5, direction: "up", locked: false, arrivalOrder: 2, x: 300, y: 300 },
    ],
    gates: [
      { id: "G01", x: 450, y: 180, width: 40, locked: false, arrivalOrder: 3 },
    ],
  },
  {
    id: "L02",
    name: "反向磁场",
    description: "磁场方向垂直纸面向外，注意圆弧偏转方向反转",
    difficulty: 2,
    energyLimit: 5000,
    initialAngle: 0,
    particle: { x: 100, y: 300, vx: 3, vy: 0, charge: 1, mass: 1, angle: 0 },
    boards: [
      { id: "B01", direction: "outof", strength: 0.025, locked: false, arrivalOrder: 1, x: 200, y: 100, width: 400, height: 400 },
    ],
    bars: [
      { id: "C01", current: 5, direction: "down", locked: false, arrivalOrder: 2, x: 300, y: 300 },
    ],
    gates: [
      { id: "G01", x: 350, y: 150, width: 40, locked: false, arrivalOrder: 3 },
    ],
  },
  {
    id: "L03",
    name: "负电荷陷阱",
    description: "负电荷受力方向与左手法则相反，小心方向反判",
    difficulty: 3,
    energyLimit: 4000,
    initialAngle: 0,
    particle: { x: 100, y: 300, vx: 3, vy: 0, charge: -1, mass: 1, angle: 0 },
    boards: [
      { id: "B01", direction: "into", strength: 0.02, locked: false, arrivalOrder: 1, x: 200, y: 100, width: 400, height: 400 },
    ],
    bars: [
      { id: "C01", current: 5, direction: "up", locked: false, arrivalOrder: 2, x: 300, y: 300 },
    ],
    gates: [
      { id: "G01", x: 400, y: 420, width: 40, locked: false, arrivalOrder: 3 },
    ],
  },
  {
    id: "L04",
    name: "能量边界",
    description: "速度接近能量上限，调节角度避免超限",
    difficulty: 4,
    energyLimit: 3000,
    initialAngle: 0,
    particle: { x: 100, y: 300, vx: 4, vy: 0, charge: 1, mass: 1, angle: 0 },
    boards: [
      { id: "B01", direction: "into", strength: 0.03, locked: false, arrivalOrder: 1, x: 200, y: 100, width: 400, height: 400 },
    ],
    bars: [
      { id: "C01", current: 6, direction: "up", locked: false, arrivalOrder: 2, x: 350, y: 250 },
    ],
    gates: [
      { id: "G01", x: 500, y: 200, width: 30, locked: false, arrivalOrder: 3 },
    ],
  },
  {
    id: "L05",
    name: "综合考核",
    description: "多参数综合判断，方向、轨迹、能量缺一不可",
    difficulty: 5,
    energyLimit: 4500,
    initialAngle: 0,
    particle: { x: 80, y: 350, vx: 3.5, vy: 0, charge: -1, mass: 1.5, angle: 0 },
    boards: [
      { id: "B01", direction: "outof", strength: 0.02, locked: false, arrivalOrder: 1, x: 150, y: 80, width: 500, height: 450 },
    ],
    bars: [
      { id: "C01", current: 4, direction: "down", locked: false, arrivalOrder: 2, x: 300, y: 300 },
    ],
    gates: [
      { id: "G01", x: 250, y: 150, width: 35, locked: false, arrivalOrder: 3 },
    ],
  },
]
