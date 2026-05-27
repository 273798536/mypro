import type { LevelConfig } from '../types';

export const levelConfigs: LevelConfig[] = [
  {
    id: 1,
    name: '斜率入门',
    difficulty: 'easy',
    functionIds: ['linear_1', 'linear_2'],
    judgementCount: 3,
    description: '学习判断直线的斜率正负'
  },
  {
    id: 2,
    name: '初识极值',
    difficulty: 'easy',
    functionIds: ['quadratic_1', 'quadratic_2'],
    judgementCount: 4,
    description: '认识二次函数的极值点'
  },
  {
    id: 3,
    name: '三次函数探险',
    difficulty: 'medium',
    functionIds: ['cubic_1', 'cubic_2'],
    judgementCount: 5,
    description: '识别三次函数的多个极值点'
  },
  {
    id: 4,
    name: '三角函数波浪',
    difficulty: 'medium',
    functionIds: ['sin_1', 'cos_1'],
    judgementCount: 6,
    description: '在周期函数中寻找极值'
  },
  {
    id: 5,
    name: '绝对值挑战',
    difficulty: 'medium',
    functionIds: ['abs_1', 'abs_2'],
    judgementCount: 5,
    description: '识别不可导点，理解尖点概念'
  },
  {
    id: 6,
    name: '指数与对数',
    difficulty: 'medium',
    functionIds: ['exp_1', 'ln_1', 'sqrt_1'],
    judgementCount: 5,
    description: '理解初等函数的斜率变化'
  },
  {
    id: 7,
    name: '有理函数',
    difficulty: 'hard',
    functionIds: ['rational_1'],
    judgementCount: 5,
    description: '处理间断点和渐近线'
  },
  {
    id: 8,
    name: '复合函数大师',
    difficulty: 'hard',
    functionIds: ['poly_hard_1', 'composite_1'],
    judgementCount: 6,
    description: '挑战复杂函数的极值判断'
  }
];

export function getLevelConfig(levelId: number): LevelConfig | undefined {
  return levelConfigs.find(l => l.id === levelId);
}

export function getTotalLevels(): number {
  return levelConfigs.length;
}
