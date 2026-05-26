import type { GameLevel } from '@/types';

export const gameLevels: GameLevel[] = [
  {
    id: 1,
    name: '入门训练',
    itemCount: 8,
    timeLimit: 60,
    difficulty: 'easy',
    description: '基础操作练习，无时间压力。学习区分退货书和正常销售书。',
  },
  {
    id: 2,
    name: '预订书识别',
    itemCount: 12,
    timeLimit: 50,
    difficulty: 'easy',
    description: '引入预订书判断，学习识别预订标记，避免误退。',
  },
  {
    id: 3,
    name: '破损书处理',
    itemCount: 15,
    timeLimit: 45,
    difficulty: 'medium',
    description: '引入破损书判断，学习识别破损标记并正确登记。',
  },
  {
    id: 4,
    name: '综合挑战',
    itemCount: 18,
    timeLimit: 40,
    difficulty: 'medium',
    description: '混合所有物品类型，考验综合判断能力。',
  },
  {
    id: 5,
    name: '限时大作战',
    itemCount: 20,
    timeLimit: 35,
    difficulty: 'hard',
    description: '限时挑战，快速决策，考验熟练程度。',
  },
];

export const getLevelById = (id: number): GameLevel | undefined => {
  return gameLevels.find(level => level.id === id);
};
