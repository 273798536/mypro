import { LevelConfig } from '../types';

export const LEVELS: LevelConfig[] = [
  {
    id: 'level-1',
    name: '新手村：普通信用债',
    description: '一只简单的3年期普通信用债，按季付息，无回售权，学习基础现金流计算',
    difficulty: 'easy',
    targetBondCount: 1,
    hasCouponDeferral: false,
    hasPutOption: false,
    hasDefaultEvent: false
  },
  {
    id: 'level-2',
    name: '票息顺延站',
    description: '遇到节假日，票息支付需要顺延，考验你对支付日期的判断',
    difficulty: 'easy',
    targetBondCount: 1,
    hasCouponDeferral: true,
    hasPutOption: false,
    hasDefaultEvent: false
  },
  {
    id: 'level-3',
    name: '回售岔道口',
    description: '债券带有投资者回售权，需要在正确时机做出选择',
    difficulty: 'medium',
    targetBondCount: 1,
    hasCouponDeferral: false,
    hasPutOption: true,
    hasDefaultEvent: false
  },
  {
    id: 'level-4',
    name: '违约隧道',
    description: '发行人发生信用事件，如何判断违约并处理后续现金流',
    difficulty: 'medium',
    targetBondCount: 1,
    hasCouponDeferral: false,
    hasPutOption: false,
    hasDefaultEvent: true
  },
  {
    id: 'level-5',
    name: '综合枢纽站',
    description: '票息顺延+回售选择权+潜在违约，完整的债券现金流处理挑战',
    difficulty: 'hard',
    targetBondCount: 1,
    hasCouponDeferral: true,
    hasPutOption: true,
    hasDefaultEvent: true
  }
];
