import { LevelConfig } from '@/types';

export const levels: LevelConfig[] = [
  {
    id: 1,
    name: '入门关卡：初识久期',
    initialRate: 3.0,
    durationBarDelayChance: 0,
    fieldMissingChance: 0.1,
    paddles: [
      { x: 100, y: 150, width: 120, height: 20, rateChange: 0.5, rateType: 'increase', isFieldMissing: false },
      { x: 300, y: 150, width: 120, height: 20, rateChange: 0.5, rateType: 'decrease', isFieldMissing: false },
      { x: 500, y: 150, width: 120, height: 20, rateChange: 0.3, rateType: 'increase', isFieldMissing: false },
      { x: 200, y: 300, width: 120, height: 20, rateChange: 0.3, rateType: 'decrease', isFieldMissing: false },
      { x: 400, y: 300, width: 120, height: 20, rateType: 'increase', isFieldMissing: true },
    ],
    cashflowItems: [
      { x: 150, y: 200, amount: 50, type: 'coupon' },
      { x: 350, y: 250, amount: 100, type: 'principal' },
      { x: 550, y: 200, amount: 30, type: 'coupon' },
    ],
  },
  {
    id: 2,
    name: '进阶关卡：利率连跳',
    initialRate: 2.5,
    durationBarDelayChance: 0.3,
    fieldMissingChance: 0.2,
    paddles: [
      { x: 80, y: 100, width: 100, height: 20, rateChange: 0.4, rateType: 'increase', isFieldMissing: false },
      { x: 220, y: 100, width: 100, height: 20, rateChange: 0.4, rateType: 'increase', isFieldMissing: false },
      { x: 360, y: 100, width: 100, height: 20, rateChange: 0.4, rateType: 'increase', isFieldMissing: false },
      { x: 150, y: 250, width: 100, height: 20, rateChange: 0.6, rateType: 'decrease', isFieldMissing: false },
      { x: 300, y: 250, width: 100, height: 20, rateType: 'decrease', isFieldMissing: true },
      { x: 450, y: 250, width: 100, height: 20, rateChange: 0.6, rateType: 'decrease', isFieldMissing: false },
    ],
    cashflowItems: [
      { x: 120, y: 180, amount: 40, type: 'coupon' },
      { x: 280, y: 180, amount: 80, type: 'principal' },
      { x: 440, y: 180, amount: 60, type: 'coupon' },
      { x: 200, y: 350, amount: 120, type: 'principal' },
    ],
  },
];

export const sampleBonds = [
  {
    id: 'bond-1',
    faceValue: 1000,
    couponRate: 4.0,
    maturity: 5,
    duration: 4.5,
    remark: '5年期国债，票息4%',
  },
  {
    id: 'bond-2',
    faceValue: 1000,
    couponRate: 3.5,
    maturity: 10,
    duration: 8.2,
  },
  {
    id: 'bond-3',
    faceValue: 500,
    couponRate: 5.0,
    maturity: 2,
    duration: 1.9,
    remark: '短期企业债',
  },
];
