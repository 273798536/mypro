import type { Level } from '../types/game';

export const NORMAL_LEVEL: Level = {
  id: 'normal-001',
  name: '月球矿区 - 常规运输',
  type: 'normal',
  description: '标准运输任务：收集矿石并安全送达基地',
  trackNodes: [
    { id: 'n1', x: 100, y: 300, connections: ['n2'] },
    { id: 'n2', x: 300, y: 300, connections: ['n1', 'n3'] },
    { id: 'n3', x: 500, y: 200, connections: ['n2', 'n4', 'n7'], isSwitch: true, switchState: 'n4' },
    { id: 'n4', x: 700, y: 150, connections: ['n3', 'n5'] },
    { id: 'n5', x: 900, y: 200, connections: ['n4', 'n6'] },
    { id: 'n6', x: 1000, y: 300, connections: ['n5', 'n8'] },
    { id: 'n7', x: 600, y: 400, connections: ['n3', 'n8'] },
    { id: 'n8', x: 800, y: 450, connections: ['n7', 'n6'] },
  ],
  trackSegments: [
    { id: 's1', startNode: 'n1', endNode: 'n2', type: 'straight' },
    { id: 's2', startNode: 'n2', endNode: 'n3', type: 'straight' },
    { id: 's3', startNode: 'n3', endNode: 'n4', type: 'straight' },
    { id: 's4', startNode: 'n4', endNode: 'n5', type: 'straight' },
    { id: 's5', startNode: 'n5', endNode: 'n6', type: 'straight' },
    { id: 's6', startNode: 'n3', endNode: 'n7', type: 'straight' },
    { id: 's7', startNode: 'n7', endNode: 'n8', type: 'straight' },
    { id: 's8', startNode: 'n8', endNode: 'n6', type: 'straight' },
  ],
  startNode: 'n1',
  endNode: 'n6',
  initialEnergy: 100,
  timeLimit: 120,
  oreLocations: [
    { x: 400, y: 250, amount: 10 },
    { x: 650, y: 175, amount: 15 },
    { x: 550, y: 350, amount: 12 },
  ],
  seed: 42,
};

export const BORDER_WRONG_SWITCH: Level = {
  id: 'border-switch',
  name: '边界样例 - 岔口误切',
  type: 'border',
  description: '测试：岔口切换时机的边界情况',
  trackNodes: [
    { id: 's1', x: 100, y: 300, connections: ['s2'] },
    { id: 's2', x: 400, y: 300, connections: ['s1', 's3'] },
    {
      id: 's3',
      x: 600,
      y: 300,
      connections: ['s2', 's4', 's6'],
      isSwitch: true,
      switchState: 's6',
    },
    { id: 's4', x: 800, y: 200, connections: ['s3', 's5'] },
    { id: 's5', x: 1000, y: 200, connections: ['s4'] },
    { id: 's6', x: 800, y: 400, connections: ['s3', 's7'] },
    { id: 's7', x: 1000, y: 400, connections: ['s6'] },
  ],
  trackSegments: [
    { id: 'seg1', startNode: 's1', endNode: 's2', type: 'straight' },
    { id: 'seg2', startNode: 's2', endNode: 's3', type: 'straight' },
    { id: 'seg3', startNode: 's3', endNode: 's4', type: 'straight' },
    { id: 'seg4', startNode: 's4', endNode: 's5', type: 'straight' },
    { id: 'seg5', startNode: 's3', endNode: 's6', type: 'straight' },
    { id: 'seg6', startNode: 's6', endNode: 's7', type: 'straight' },
  ],
  startNode: 's1',
  endNode: 's5',
  initialEnergy: 100,
  timeLimit: 60,
  oreLocations: [{ x: 500, y: 300, amount: 20 }],
  seed: 1001,
};

export const BORDER_ENERGY_DEPLETE: Level = {
  id: 'border-energy',
  name: '边界样例 - 能量耗尽',
  type: 'border',
  description: '测试：能量刚好不足以完成任务的边界情况',
  trackNodes: [
    { id: 'e1', x: 100, y: 300, connections: ['e2'] },
    { id: 'e2', x: 400, y: 300, connections: ['e1', 'e3'] },
    { id: 'e3', x: 700, y: 300, connections: ['e2', 'e4'] },
    { id: 'e4', x: 1000, y: 300, connections: ['e3'] },
  ],
  trackSegments: [
    { id: 'es1', startNode: 'e1', endNode: 'e2', type: 'straight' },
    { id: 'es2', startNode: 'e2', endNode: 'e3', type: 'straight' },
    { id: 'es3', startNode: 'e3', endNode: 'e4', type: 'straight' },
  ],
  startNode: 'e1',
  endNode: 'e4',
  initialEnergy: 30,
  timeLimit: 120,
  oreLocations: [
    { x: 550, y: 300, amount: 10 },
  ],
  seed: 1002,
};

export const BORDER_COLLISION: Level = {
  id: 'border-collision',
  name: '边界样例 - 矿车相撞',
  type: 'border',
  description: '测试：对向矿车碰撞的边界情况',
  trackNodes: [
    { id: 'c1', x: 100, y: 300, connections: ['c2'] },
    { id: 'c2', x: 550, y: 300, connections: ['c1', 'c3'] },
    { id: 'c3', x: 1000, y: 300, connections: ['c2'] },
  ],
  trackSegments: [
    { id: 'cs1', startNode: 'c1', endNode: 'c2', type: 'straight' },
    { id: 'cs2', startNode: 'c2', endNode: 'c3', type: 'straight' },
  ],
  startNode: 'c1',
  endNode: 'c3',
  initialEnergy: 100,
  timeLimit: 60,
  oreLocations: [],
  collisionCarts: [
    { x: 900, y: 300, vx: -80, vy: 0 },
  ],
  seed: 1003,
};

export const LEVELS: Level[] = [
  NORMAL_LEVEL,
  BORDER_WRONG_SWITCH,
  BORDER_ENERGY_DEPLETE,
  BORDER_COLLISION,
];

export function getLevelById(id: string): Level | undefined {
  return LEVELS.find((l) => l.id === id);
}
