import type { LevelData } from '../store/gameStore'

export const levels: LevelData[] = [
  {
    id: 1,
    name: '基础探测',
    description: '无回声延迟干扰，无频率混叠。熟悉声波脉冲发射与回声判定操作，路径清晰可辨。',
    obstacles: [
      { id: 'o1', position: { x: 300, y: 150 }, size: 40, type: 'rock', reflectivity: 0.9, dopplerShift: 0 },
      { id: 'o2', position: { x: 550, y: 300 }, size: 35, type: 'rock', reflectivity: 0.85, dopplerShift: 0 },
      { id: 'o3', position: { x: 200, y: 400 }, size: 30, type: 'mine', reflectivity: 0.7, dopplerShift: 0 },
    ],
    subStartPosition: { x: 100, y: 300 },
    goalPosition: { x: 700, y: 300 },
    paths: [
      { direction: 'left', waypoints: [{ x: 100, y: 300 }, { x: 250, y: 120 }, { x: 500, y: 120 }, { x: 700, y: 200 }], obstacleIds: [], isSafe: true, energyCost: 5 },
      { direction: 'center', waypoints: [{ x: 100, y: 300 }, { x: 350, y: 300 }, { x: 550, y: 300 }, { x: 700, y: 300 }], obstacleIds: ['o2'], isSafe: false, energyCost: 3 },
      { direction: 'right', waypoints: [{ x: 100, y: 300 }, { x: 250, y: 480 }, { x: 500, y: 480 }, { x: 700, y: 400 }], obstacleIds: [], isSafe: true, energyCost: 7 },
    ],
    echoInterference: { delayJitter: 0, aliasingProbability: 0, noiseLevel: 0 },
    initialEnergy: 100,
  },
  {
    id: 2,
    name: '回声延迟',
    description: '障碍物距离差异大，回声延迟不等。部分回声在路径选择后才到达，判定时信息不完整——日常最烦的"对账"问题。',
    obstacles: [
      { id: 'o1', position: { x: 200, y: 100 }, size: 35, type: 'rock', reflectivity: 0.85, dopplerShift: 0 },
      { id: 'o2', position: { x: 400, y: 250 }, size: 45, type: 'mine', reflectivity: 0.9, dopplerShift: 5 },
      { id: 'o3', position: { x: 600, y: 150 }, size: 30, type: 'rock', reflectivity: 0.8, dopplerShift: 0 },
      { id: 'o4', position: { x: 350, y: 420 }, size: 50, type: 'current', reflectivity: 0.6, dopplerShift: 15 },
      { id: 'o5', position: { x: 550, y: 400 }, size: 25, type: 'mine', reflectivity: 0.75, dopplerShift: -8 },
    ],
    subStartPosition: { x: 80, y: 280 },
    goalPosition: { x: 720, y: 280 },
    paths: [
      { direction: 'left', waypoints: [{ x: 80, y: 280 }, { x: 200, y: 80 }, { x: 450, y: 80 }, { x: 650, y: 150 }, { x: 720, y: 200 }], obstacleIds: ['o3'], isSafe: false, energyCost: 8 },
      { direction: 'center', waypoints: [{ x: 80, y: 280 }, { x: 300, y: 280 }, { x: 500, y: 280 }, { x: 720, y: 280 }], obstacleIds: [], isSafe: true, energyCost: 5 },
      { direction: 'right', waypoints: [{ x: 80, y: 280 }, { x: 250, y: 450 }, { x: 500, y: 450 }, { x: 720, y: 380 }], obstacleIds: ['o4', 'o5'], isSafe: false, energyCost: 6 },
    ],
    echoInterference: { delayJitter: 15, aliasingProbability: 0.1, noiseLevel: 0.15 },
    initialEnergy: 100,
  },
  {
    id: 3,
    name: '频率混叠',
    description: '密集障碍物导致回声频率重叠，低频脉冲无法区分，高频脉冲能量消耗大。频率选择与障碍物分布不匹配——"对齐"问题加能量耗尽风险。',
    obstacles: [
      { id: 'o1', position: { x: 250, y: 120 }, size: 30, type: 'rock', reflectivity: 0.9, dopplerShift: 3 },
      { id: 'o2', position: { x: 270, y: 160 }, size: 25, type: 'mine', reflectivity: 0.85, dopplerShift: -5 },
      { id: 'o3', position: { x: 290, y: 140 }, size: 20, type: 'rock', reflectivity: 0.8, dopplerShift: 8 },
      { id: 'o4', position: { x: 450, y: 300 }, size: 45, type: 'mine', reflectivity: 0.95, dopplerShift: 0 },
      { id: 'o5', position: { x: 550, y: 180 }, size: 28, type: 'rock', reflectivity: 0.7, dopplerShift: 12 },
      { id: 'o6', position: { x: 560, y: 210 }, size: 22, type: 'current', reflectivity: 0.65, dopplerShift: -10 },
      { id: 'o7', position: { x: 400, y: 420 }, size: 35, type: 'rock', reflectivity: 0.8, dopplerShift: 0 },
    ],
    subStartPosition: { x: 80, y: 300 },
    goalPosition: { x: 720, y: 300 },
    paths: [
      { direction: 'left', waypoints: [{ x: 80, y: 300 }, { x: 200, y: 100 }, { x: 400, y: 100 }, { x: 600, y: 150 }, { x: 720, y: 200 }], obstacleIds: ['o1', 'o2', 'o3', 'o5', 'o6'], isSafe: false, energyCost: 10 },
      { direction: 'center', waypoints: [{ x: 80, y: 300 }, { x: 250, y: 300 }, { x: 450, y: 300 }, { x: 720, y: 300 }], obstacleIds: ['o4'], isSafe: false, energyCost: 4 },
      { direction: 'right', waypoints: [{ x: 80, y: 300 }, { x: 200, y: 460 }, { x: 450, y: 460 }, { x: 720, y: 400 }], obstacleIds: ['o7'], isSafe: false, energyCost: 7 },
    ],
    echoInterference: { delayJitter: 10, aliasingProbability: 0.6, noiseLevel: 0.3 },
    initialEnergy: 85,
  },
]
