import type { LevelConfig } from '../types/game';

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: '新手海域',
    description: '平静的近海海域，噪声干扰少，适合初次接触声呐探测。潜艇移动缓慢，转向不频繁。',
    difficulty: 'easy',
    gridSize: 8,
    maxTurns: 15,
    maxEnergy: 100,
    scanCost: 10,
    cooldownTime: 1,
    submarineSpeed: 1,
    turnProbability: 0.1,
    noiseSourceCount: 1,
    noiseIntensityRange: [20, 40],
    targetScore: 600
  },
  {
    id: 2,
    name: '大陆架边缘',
    description: '海域开始变复杂，有少量噪声源。潜艇速度提升，需要更精确的推理。',
    difficulty: 'easy',
    gridSize: 8,
    maxTurns: 12,
    maxEnergy: 100,
    scanCost: 12,
    cooldownTime: 1,
    submarineSpeed: 1,
    turnProbability: 0.2,
    noiseSourceCount: 2,
    noiseIntensityRange: [30, 50],
    targetScore: 700
  },
  {
    id: 3,
    name: '深海峡谷',
    description: '复杂的海底地形带来更多噪声干扰。潜艇开始频繁转向，轨迹难以预测。',
    difficulty: 'medium',
    gridSize: 10,
    maxTurns: 12,
    maxEnergy: 120,
    scanCost: 15,
    cooldownTime: 2,
    submarineSpeed: 1,
    turnProbability: 0.3,
    noiseSourceCount: 3,
    noiseIntensityRange: [40, 60],
    targetScore: 800
  },
  {
    id: 4,
    name: '繁忙航道',
    description: '商船频繁经过的航道，噪声干扰严重。潜艇速度快，需要快速决策。',
    difficulty: 'medium',
    gridSize: 10,
    maxTurns: 10,
    maxEnergy: 120,
    scanCost: 18,
    cooldownTime: 2,
    submarineSpeed: 2,
    turnProbability: 0.25,
    noiseSourceCount: 4,
    noiseIntensityRange: [50, 70],
    targetScore: 900
  },
  {
    id: 5,
    name: '极地冰下',
    description: '极端环境，冰层反射造成大量噪声。潜艇神出鬼没，是对声呐技能的终极考验。',
    difficulty: 'hard',
    gridSize: 12,
    maxTurns: 10,
    maxEnergy: 150,
    scanCost: 20,
    cooldownTime: 3,
    submarineSpeed: 2,
    turnProbability: 0.4,
    noiseSourceCount: 5,
    noiseIntensityRange: [60, 80],
    targetScore: 1000
  }
];

export const getLevelById = (id: number): LevelConfig | undefined => {
  return LEVELS.find(level => level.id === id);
};

export const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty) {
    case 'easy': return 'text-green-400';
    case 'medium': return 'text-yellow-400';
    case 'hard': return 'text-red-400';
    default: return 'text-gray-400';
  }
};

export const getDifficultyLabel = (difficulty: string): string => {
  switch (difficulty) {
    case 'easy': return '简单';
    case 'medium': return '中等';
    case 'hard': return '困难';
    default: return '未知';
  }
};
