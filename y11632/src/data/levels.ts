import type { Level } from '@/types';

export const levels: Level[] = [
  {
    id: 'level-1',
    name: '初识久期',
    description: '学习区分短期、中期、长期债券。将债券卡牌拖入对应的久期槽位。',
    bonds: [],
    slots: [
      { id: 'slot-s', levelId: 'level-1', minDuration: 0, maxDuration: 2, label: '短久期 (0-2年)' },
      { id: 'slot-m', levelId: 'level-1', minDuration: 2, maxDuration: 6, label: '中久期 (2-6年)' },
      { id: 'slot-l', levelId: 'level-1', minDuration: 6, maxDuration: 15, label: '长久期 (6-15年)' },
    ],
    yieldCurve: {
      id: 'yc-1',
      name: '正常收益率曲线',
      direction: 'flat',
      shiftAmount: 0,
      points: [
        { term: 1, yield: 2.5 },
        { term: 2, yield: 2.8 },
        { term: 5, yield: 3.5 },
        { term: 10, yield: 4.0 },
        { term: 20, yield: 4.2 },
      ],
    },
    targetScore: 100,
    timeLimit: 120,
    learningPoints: [
      { id: 'lp-1-1', levelId: 'level-1', title: '什么是久期', content: '久期(Duration)衡量债券价格对利率变动的敏感度，以年为单位。久期越长，利率风险越大。' },
      { id: 'lp-1-2', levelId: 'level-1', title: '久期与到期时间的关系', content: '一般来说，到期时间越长，久期也越长。但久期还受票面利率影响：票面利率越低，久期越长。' },
      { id: 'lp-1-3', levelId: 'level-1', title: '零息债券的久期', content: '零息债券的久期等于其到期时间，因为所有现金流都在到期时一次性支付。' },
    ],
  },
  {
    id: 'level-2',
    name: '曲线波动',
    description: '理解收益率曲线平移方向对不同久期债券的影响。调整曲线方向并匹配债券。',
    bonds: [],
    slots: [
      { id: 'slot-s2', levelId: 'level-2', minDuration: 0, maxDuration: 2, label: '短久期 (0-2年)' },
      { id: 'slot-m2', levelId: 'level-2', minDuration: 2, maxDuration: 6, label: '中久期 (2-6年)' },
      { id: 'slot-l2', levelId: 'level-2', minDuration: 6, maxDuration: 15, label: '长久期 (6-15年)' },
    ],
    yieldCurve: {
      id: 'yc-2',
      name: '平移后的收益率曲线',
      direction: 'up',
      shiftAmount: 0.5,
      points: [
        { term: 1, yield: 3.0 },
        { term: 2, yield: 3.3 },
        { term: 5, yield: 4.0 },
        { term: 10, yield: 4.5 },
        { term: 20, yield: 4.7 },
      ],
    },
    targetScore: 100,
    timeLimit: 180,
    learningPoints: [
      { id: 'lp-2-1', levelId: 'level-2', title: '利率上升对债券价格的影响', content: '当利率上升时，债券价格下降。久期越长的债券，价格下降幅度越大。这是因为长久期债券的未来现金流折现率更高。' },
      { id: 'lp-2-2', levelId: 'level-2', title: '利率下降对债券价格的影响', content: '当利率下降时，债券价格上升。长久期债券价格上升幅度更大，因为其未来现金流的现值增加更多。' },
      { id: 'lp-2-3', levelId: 'level-2', title: '价格变化的近似公式', content: '债券价格变化百分比 ≈ -久期 × 利率变化。例如久期5年的债券，利率上升1%，价格约下降5%。' },
    ],
  },
  {
    id: 'level-3',
    name: '现金流权重',
    description: '深入理解久期的本质：各期现金流的加权平均时间。调整各期现金流权重使久期计算准确。',
    bonds: [],
    slots: [
      { id: 'slot-s3', levelId: 'level-3', minDuration: 0, maxDuration: 2, label: '短久期 (0-2年)' },
      { id: 'slot-m3', levelId: 'level-3', minDuration: 2, maxDuration: 6, label: '中久期 (2-6年)' },
      { id: 'slot-l3', levelId: 'level-3', minDuration: 6, maxDuration: 15, label: '长久期 (6-15年)' },
    ],
    yieldCurve: {
      id: 'yc-3',
      name: '动态收益率曲线',
      direction: 'flat',
      shiftAmount: 0,
      points: [
        { term: 1, yield: 2.5 },
        { term: 2, yield: 2.8 },
        { term: 5, yield: 3.5 },
        { term: 10, yield: 4.0 },
        { term: 20, yield: 4.2 },
      ],
    },
    targetScore: 150,
    timeLimit: 240,
    learningPoints: [
      { id: 'lp-3-1', levelId: 'level-3', title: '久期的精确计算', content: '久期 = Σ(每期现金流现值 × 期数) / 债券总现值。可以理解为：按现金流权重加权平均的到期时间。' },
      { id: 'lp-3-2', levelId: 'level-3', title: '票面利率如何影响久期', content: '票面利率越高，前期利息占比越大，久期越短。票面利率越低，本金偿还的权重越高，久期越长。' },
      { id: 'lp-3-3', levelId: 'level-3', title: '久期的投资意义', content: '久期不仅是风险指标，也是投资策略工具。预期利率下降时增加长久期债券，预期利率上升时转向短久期债券。' },
    ],
  },
];

export function getLevelById(id: string): Level | undefined {
  return levels.find(l => l.id === id);
}

export function getLevelIndex(levelId: string): number {
  return levels.findIndex(l => l.id === levelId);
}
