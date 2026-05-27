import type { Level, CellType } from './types';

const createGrid = (width: number, height: number, walls: [number, number][] = []): CellType[][] => {
  const grid: CellType[][] = [];
  for (let y = 0; y < height; y++) {
    grid[y] = [];
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        grid[y][x] = 'wall';
      } else {
        grid[y][x] = 'empty';
      }
    }
  }
  for (const [wx, wy] of walls) {
    if (wy >= 0 && wy < height && wx >= 0 && wx < width) {
      grid[wy][wx] = 'wall';
    }
  }
  return grid;
};

const cellSize = 40;

export const LEVELS: Level[] = [
  {
    id: 1,
    name: '入门：直线加速',
    description: '学习放置正电荷排斥带正电的小球，引导它到达终点',
    difficulty: 'easy',
    maze: {
      width: 15,
      height: 9,
      cellSize,
      grid: createGrid(15, 9),
      startPos: { x: 1, y: 4 },
      endPos: { x: 13, y: 4 },
    },
    initialEnergy: 100,
    timeLimit: 60,
    ballCharge: 1,
    ballInitialVelocity: { x: 30, y: 0 },
    obstacles: [],
  },
  {
    id: 2,
    name: '转弯：引力偏转',
    description: '使用负电荷吸引小球，使其改变方向绕过障碍',
    difficulty: 'easy',
    maze: {
      width: 15,
      height: 9,
      cellSize,
      grid: createGrid(15, 9, [
        [7, 1], [7, 2], [7, 3], [7, 4],
      ]),
      startPos: { x: 1, y: 2 },
      endPos: { x: 13, y: 6 },
    },
    initialEnergy: 150,
    timeLimit: 90,
    ballCharge: 1,
    ballInitialVelocity: { x: 40, y: 0 },
    obstacles: [],
  },
  {
    id: 3,
    name: 'S形通道',
    description: '在狭窄的S形通道中精确控制小球路径',
    difficulty: 'medium',
    maze: {
      width: 15,
      height: 9,
      cellSize,
      grid: createGrid(15, 9, [
        [1, 3], [2, 3], [3, 3], [4, 3], [5, 3],
        [9, 5], [10, 5], [11, 5], [12, 5], [13, 5],
        [5, 1], [5, 2],
        [9, 6], [9, 7],
      ]),
      startPos: { x: 1, y: 1 },
      endPos: { x: 13, y: 7 },
    },
    initialEnergy: 200,
    timeLimit: 120,
    ballCharge: 1,
    ballInitialVelocity: { x: 50, y: 0 },
    obstacles: [],
  },
  {
    id: 4,
    name: '双重排斥',
    description: '使用两个正电荷将小球推向终点',
    difficulty: 'medium',
    maze: {
      width: 15,
      height: 9,
      cellSize,
      grid: createGrid(15, 9, [
        [5, 0], [5, 1], [5, 2], [5, 6], [5, 7], [5, 8],
        [9, 0], [9, 1], [9, 2], [9, 6], [9, 7], [9, 8],
      ]),
      startPos: { x: 1, y: 4 },
      endPos: { x: 13, y: 4 },
    },
    initialEnergy: 200,
    timeLimit: 90,
    ballCharge: -1,
    ballInitialVelocity: { x: 0, y: 0 },
    obstacles: [],
  },
  {
    id: 5,
    name: '障碍物区域',
    description: '避开紫色障碍物，它们会吸收小球',
    difficulty: 'medium',
    maze: {
      width: 15,
      height: 9,
      cellSize,
      grid: createGrid(15, 9),
      startPos: { x: 1, y: 4 },
      endPos: { x: 13, y: 4 },
    },
    initialEnergy: 250,
    timeLimit: 120,
    ballCharge: 1,
    ballInitialVelocity: { x: 40, y: 0 },
    obstacles: [
      { position: { x: 200, y: 120 }, width: 80, height: 40, type: 'neutral' },
      { position: { x: 320, y: 200 }, width: 40, height: 80, type: 'neutral' },
      { position: { x: 400, y: 100 }, width: 60, height: 60, type: 'neutral' },
    ],
  },
  {
    id: 6,
    name: '迷宫穿越',
    description: '在复杂迷宫中找到正确的电荷放置位置',
    difficulty: 'hard',
    maze: {
      width: 15,
      height: 9,
      cellSize,
      grid: createGrid(15, 9, [
        [2, 2], [3, 2], [4, 2], [6, 2], [7, 2], [8, 2], [10, 2], [11, 2], [12, 2],
        [2, 4], [4, 4], [5, 4], [6, 4], [8, 4], [9, 4], [10, 4], [12, 4],
        [2, 6], [3, 6], [4, 6], [6, 6], [7, 6], [8, 6], [10, 6], [11, 6], [12, 6],
      ]),
      startPos: { x: 1, y: 1 },
      endPos: { x: 13, y: 7 },
    },
    initialEnergy: 300,
    timeLimit: 180,
    ballCharge: 1,
    ballInitialVelocity: { x: 0, y: 30 },
    obstacles: [],
  },
  {
    id: 7,
    name: '精准控制',
    description: '小球初始速度很快，需要精确放置电荷来减速和转向',
    difficulty: 'hard',
    maze: {
      width: 15,
      height: 9,
      cellSize,
      grid: createGrid(15, 9, [
        [7, 3], [7, 4], [7, 5],
        [3, 1], [3, 2], [3, 6], [3, 7],
        [11, 1], [11, 2], [11, 6], [11, 7],
      ]),
      startPos: { x: 1, y: 4 },
      endPos: { x: 13, y: 4 },
    },
    initialEnergy: 250,
    timeLimit: 120,
    ballCharge: 1,
    ballInitialVelocity: { x: 100, y: 0 },
    obstacles: [],
  },
  {
    id: 8,
    name: '终极挑战',
    description: '综合运用所有技巧，完成最终挑战',
    difficulty: 'hard',
    maze: {
      width: 17,
      height: 11,
      cellSize,
      grid: createGrid(17, 11, [
        [3, 1], [3, 2], [3, 3], [3, 7], [3, 8], [3, 9],
        [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5],
        [13, 1], [13, 2], [13, 3], [13, 7], [13, 8], [13, 9],
        [7, 1], [7, 2], [9, 8], [9, 9],
      ]),
      startPos: { x: 1, y: 5 },
      endPos: { x: 15, y: 5 },
    },
    initialEnergy: 400,
    timeLimit: 240,
    ballCharge: -1,
    ballInitialVelocity: { x: 0, y: 0 },
    obstacles: [
      { position: { x: 280, y: 80 }, width: 40, height: 40, type: 'neutral' },
      { position: { x: 360, y: 320 }, width: 40, height: 40, type: 'neutral' },
    ],
  },
];

export const getLevelById = (id: number): Level | undefined => {
  return LEVELS.find(level => level.id === id);
};

export const getUnlockedLevels = (completedLevelIds: number[]): number[] => {
  if (completedLevelIds.length === 0) return [1];
  
  const maxCompleted = Math.max(...completedLevelIds);
  const unlocked: number[] = [];
  
  for (const level of LEVELS) {
    if (level.id <= maxCompleted + 1) {
      unlocked.push(level.id);
    }
  }
  
  return unlocked;
};
