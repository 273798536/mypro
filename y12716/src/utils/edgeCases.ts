import type { EdgeCase } from '@/types';

export const edgeCases: EdgeCase[] = [
  {
    id: 'EC-001',
    title: '案例一：单位缺失导致评分偏差',
    description:
      'Q007（含参数方程讨论）从草稿纸迁移到旧表时，做题时间单位"分钟"字段丢失，系统默认使用"题"作为单位。虽然单位不直接参与评分计算，但单位缺失会触发难度校验逻辑——缺失单位的记录难度评分会被打8折处理，导致综合评分下降，排期位次从第3位后移至第8位，批次从第1批变为第2批。这是真实场景中常见的数据迁移小问题。',
    beforeData: {
      id: 'Q007',
      unit: '分钟',
      difficulty: 5,
    },
    afterData: {
      id: 'Q007',
      unit: null,
      difficulty: 4,
    },
    resultChange:
      '位次：3 → 8（后移5位）| 批次：第1批 → 第2批 | 发布日期：+3天 | 置信度：0.92 → 0.74',
    affectedQuestions: ['Q007'],
    beforeRank: 3,
    afterRank: 8,
    beforeBatch: 1,
    afterBatch: 2,
  },
  {
    id: 'EC-002',
    title: '案例二：同分拓扑排序不稳定',
    description:
      'Q012（方程组消元法-代入）和 Q015（方程组应用题-鸡兔同笼）综合评分均为 0.564，且两者之间没有依赖关系。Kahn 拓扑排序算法在入度相同的节点中，默认按题目 ID 字典序排列（Q012 在 Q015 前）。当误差分析中将错题率权重从 0.30 微调至 0.31 时，Q015 的评分（错题率与 Q012 相同但应用题章节权重更高）略微反超 Q012，导致两者位次互换，发布日期相差 3 天。这是同分排序边界的真实体现。',
    beforeData: {
      id: 'Q012',
      errorRate: 0.30,
    },
    afterData: {
      id: 'Q015',
      errorRate: 0.30,
    },
    resultChange:
      '位次互换：Q012(10→11) ↔ Q015(11→10) | 发布日期各差3天 | 同分排序受误差参数影响明显',
    affectedQuestions: ['Q012', 'Q015'],
    beforeRank: 10,
    afterRank: 11,
    beforeBatch: 2,
    afterBatch: 3,
  },
  {
    id: 'EC-003',
    title: '案例三：评分缺失导致级联影响',
    description:
      'Q023（含绝对值综合题）的难度评分在旧表导出时丢失，系统使用所在章节的平均难度（4.0）作为兜底值，并将置信度降低 20%。Q023 本身位次从第 13 位后移至第 18 位，更重要的是其下游依赖题 Q024 和 Q026 因依赖深度惩罚增加，连同 Q025 一起整体从第 2 批后移至第 3 批。这是单条记录缺失引发级联排期偏移的典型场景。',
    beforeData: {
      id: 'Q023',
      difficulty: 5,
    },
    afterData: {
      id: 'Q023',
      difficulty: null,
    },
    resultChange:
      'Q023：位次13→18，批次2→3 | Q024/Q025/Q026：整体从第2批移至第3批，发布日期全部+3天',
    affectedQuestions: ['Q023', 'Q024', 'Q025', 'Q026'],
    beforeRank: 13,
    afterRank: 18,
    beforeBatch: 2,
    afterBatch: 3,
  },
];
