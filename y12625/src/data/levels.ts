import { Level } from '@/types';

export const LEVELS: Level[] = [
  {
    id: 'level-1',
    name: '基础函数绘制',
    description: '绘制 y = x² 函数曲线并对指定区域涂色',
    gridSize: 20,
    targetFunction: 'y = x^2',
    boundary: { x: 5, y: 5 },
    status: 'unlocked'
  },
  {
    id: 'level-2',
    name: '边界失败验证',
    description: '尝试在边界外绘制，体验边界失败机制与重开功能',
    gridSize: 20,
    targetFunction: 'y = sin(x)',
    boundary: { x: 3, y: 3 },
    status: 'unlocked'
  }
];

export function getLevelById(id: string): Level | undefined {
  return LEVELS.find(level => level.id === id);
}
