import type { ParamVersion } from '@/types';

export const paramVersions: ParamVersion[] = [
  {
    version: 'v2.1.0',
    formula: 'E = α·H + β·T + γ·σ + δ',
    formulaDescription: '误差值由波高、波周期、标准差和偏移量线性加权计算',
    variables: [
      { symbol: 'E', name: '误差值', unit: 'm', description: '最终归因误差值' },
      { symbol: 'α', name: '波高权重系数', unit: '-', description: '波高对误差的影响权重' },
      { symbol: 'H', name: '有效波高', unit: 'm', description: '三分之一大波的平均波高' },
      { symbol: 'β', name: '波周期权重系数', unit: '-', description: '波周期对误差的影响权重' },
      { symbol: 'T', name: '平均波周期', unit: 's', description: '相邻波峰的时间间隔平均值' },
      { symbol: 'γ', name: '标准差权重系数', unit: '-', description: '数据离散度对误差的影响权重' },
      { symbol: 'σ', name: '标准差', unit: 'm', description: '波高数据的标准差' },
      { symbol: 'δ', name: '系统偏移量', unit: 'm', description: '仪器系统误差补偿值' },
    ],
    description: '优化了大浪区间的误差拟合，新增标准差校正项',
    boundaryValues: [
      { name: '波高上限', value: 15.0, unit: 'm', description: '超过此值标记为极端值' },
      { name: '波高下限', value: 0.1, unit: 'm', description: '低于此值标记为异常低值' },
      { name: '波周期上限', value: 25.0, unit: 's', description: '超过此值标记为异常长周期' },
      { name: '波周期下限', value: 1.5, unit: 's', description: '低于此值标记为异常短周期' },
      { name: '误差阈值', value: 0.5, unit: 'm', description: '绝对误差超过此值标记为异常' },
      { name: '噪声阈值', value: 2.0, unit: 'σ', description: '超过2倍标准差疑似噪声' },
    ],
    createdAt: '2024-03-15 14:30:00',
  },
  {
    version: 'v2.0.0',
    formula: 'E = α·H + β·T + δ',
    formulaDescription: '误差值由波高和波周期线性加权计算',
    variables: [
      { symbol: 'E', name: '误差值', unit: 'm', description: '最终归因误差值' },
      { symbol: 'α', name: '波高权重系数', unit: '-', description: '波高对误差的影响权重' },
      { symbol: 'H', name: '有效波高', unit: 'm', description: '三分之一大波的平均波高' },
      { symbol: 'β', name: '波周期权重系数', unit: '-', description: '波周期对误差的影响权重' },
      { symbol: 'T', name: '平均波周期', unit: 's', description: '相邻波峰的时间间隔平均值' },
      { symbol: 'δ', name: '系统偏移量', unit: 'm', description: '仪器系统误差补偿值' },
    ],
    description: '第二代误差归因算法，引入波周期修正项',
    boundaryValues: [
      { name: '波高上限', value: 12.0, unit: 'm', description: '超过此值标记为极端值' },
      { name: '波高下限', value: 0.2, unit: 'm', description: '低于此值标记为异常低值' },
      { name: '波周期上限', value: 20.0, unit: 's', description: '超过此值标记为异常长周期' },
      { name: '误差阈值', value: 0.8, unit: 'm', description: '绝对误差超过此值标记为异常' },
    ],
    createdAt: '2024-01-10 09:00:00',
  },
  {
    version: 'v1.5.2',
    formula: 'E = k·H + b',
    formulaDescription: '误差值与波高成线性关系',
    variables: [
      { symbol: 'E', name: '误差值', unit: 'm', description: '最终归因误差值' },
      { symbol: 'k', name: '比例系数', unit: '-', description: '波高与误差的比例关系' },
      { symbol: 'H', name: '有效波高', unit: 'm', description: '三分之一大波的平均波高' },
      { symbol: 'b', name: '常数偏移', unit: 'm', description: '基础误差值' },
    ],
    description: '经典线性模型，适用于常规海况',
    boundaryValues: [
      { name: '波高上限', value: 10.0, unit: 'm', description: '超过此值标记为极端值' },
      { name: '误差阈值', value: 1.0, unit: 'm', description: '绝对误差超过此值标记为异常' },
    ],
    createdAt: '2023-08-22 16:45:00',
  },
];

export const defaultVersion = 'v2.1.0';
