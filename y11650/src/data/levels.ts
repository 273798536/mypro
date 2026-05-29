import type { LevelConfig } from '../types/game'

export const LEVELS: LevelConfig[] = [
  {
    id: 'level-1',
    name: '新手入门',
    description: '学习基本备餐流程，2个窗口，无过敏原订单',
    difficulty: 1,
    duration: 60,
    orderIntervalMin: 4000,
    orderIntervalMax: 6000,
    windowConfigs: [
      { grade: '一年级', maxQueue: 3 },
      { grade: '二年级', maxQueue: 3 },
    ],
    prepSlotCount: 2,
    targetScore: 500,
  },
  {
    id: 'level-2',
    name: '过敏原初识',
    description: '出现过敏原订单，注意检查过敏标签！',
    difficulty: 2,
    duration: 90,
    orderIntervalMin: 3500,
    orderIntervalMax: 5500,
    windowConfigs: [
      { grade: '一年级', maxQueue: 3 },
      { grade: '二年级', maxQueue: 3 },
      { grade: '三年级', maxQueue: 3 },
    ],
    prepSlotCount: 3,
    targetScore: 1200,
  },
  {
    id: 'level-3',
    name: '窗口拥堵',
    description: '更多年级窗口，订单密度增大，注意窗口排队！',
    difficulty: 3,
    duration: 120,
    orderIntervalMin: 2500,
    orderIntervalMax: 4500,
    windowConfigs: [
      { grade: '一年级', maxQueue: 3 },
      { grade: '二年级', maxQueue: 3 },
      { grade: '三年级', maxQueue: 3 },
      { grade: '四年级', maxQueue: 3 },
    ],
    prepSlotCount: 3,
    targetScore: 2000,
  },
  {
    id: 'level-4',
    name: '高压备餐',
    description: '高密度订单+多重过敏原，真正的考验！',
    difficulty: 4,
    duration: 120,
    orderIntervalMin: 2000,
    orderIntervalMax: 3500,
    windowConfigs: [
      { grade: '一年级', maxQueue: 4 },
      { grade: '二年级', maxQueue: 4 },
      { grade: '三年级', maxQueue: 4 },
      { grade: '四年级', maxQueue: 4 },
      { grade: '五年级', maxQueue: 4 },
    ],
    prepSlotCount: 4,
    targetScore: 3000,
  },
  {
    id: 'level-5',
    name: '终极挑战',
    description: '6个年级窗口全开，过敏原+拥堵+浪费三重考验！',
    difficulty: 5,
    duration: 150,
    orderIntervalMin: 1500,
    orderIntervalMax: 3000,
    windowConfigs: [
      { grade: '一年级', maxQueue: 4 },
      { grade: '二年级', maxQueue: 4 },
      { grade: '三年级', maxQueue: 4 },
      { grade: '四年级', maxQueue: 4 },
      { grade: '五年级', maxQueue: 4 },
      { grade: '六年级', maxQueue: 4 },
    ],
    prepSlotCount: 4,
    targetScore: 4000,
  },
]

export function getLevelById(id: string): LevelConfig | undefined {
  return LEVELS.find(l => l.id === id)
}
