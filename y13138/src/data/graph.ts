import type { MarkovNode, MarkovEdge } from '@/types';

export const markovNodes: MarkovNode[] = [
  {
    id: 'S0',
    romanLabel: 'Ⅰ',
    displayName: '未掌握',
    steadyProb: 0.295,
    initialProb: 0.4,
    sampleCount: 12,
    isAbnormal: false,
    relatedParamIds: ['P-01', 'P-03', 'P-04'],
    relatedRecordIds: ['R-001'],
    x: 120,
    y: 180,
  },
  {
    id: 'S1',
    romanLabel: 'Ⅱ',
    displayName: '初步理解',
    steadyProb: 0.31,
    initialProb: 0.35,
    sampleCount: 10,
    isAbnormal: false,
    relatedParamIds: ['P-02', 'P-03', 'P-04', 'P-05'],
    relatedRecordIds: ['R-001', 'R-002'],
    x: 360,
    y: 90,
  },
  {
    id: 'S2',
    romanLabel: 'Ⅲ',
    displayName: '掌握',
    steadyProb: 0.245,
    initialProb: 0.18,
    sampleCount: 3,
    isAbnormal: true,
    abnormalReason: '边界样本n=3 < 阈值θ=5（见参数表P-07行），稳态π₂外推不可靠',
    relatedParamIds: ['P-05', 'P-06', 'P-07'],
    relatedRecordIds: ['R-003'],
    x: 600,
    y: 180,
  },
  {
    id: 'S3',
    romanLabel: 'Ⅳ',
    displayName: '熟练应用',
    steadyProb: 0.15,
    initialProb: 0.07,
    sampleCount: 8,
    isAbnormal: false,
    overflowWarning: 't=120min外推概率接近1.0上界',
    relatedParamIds: ['P-06', 'P-08'],
    relatedRecordIds: ['R-004'],
    x: 480,
    y: 320,
  },
];

const calcSteps01 = [
  '样本统计：S₀→S₁共观察到12次转移',
  'S₀总出度n=34次',
  'P(S₀→S₁) = 12/34 ≈ 0.353 → 取0.35',
];
const calcSteps10 = [
  '遗忘回退观察：S₁→S₀共4次',
  'S₁总出度n=33次',
  'P(S₁→S₀) = 4/33 ≈ 0.121 → 取0.12',
];
const calcSteps12 = [
  '课堂主样本观察：S₁→S₂共9次',
  'S₁总出度n=33次',
  'P(S₁→S₂) = 9/33 ≈ 0.273 → 取0.28',
];
const calcSteps23 = [
  '边界观察：S₂→S₃仅3次（⚠️n=3<θ=5）',
  'S₂总出度n=15次',
  'P(S₂→S₃) = 3/15 = 0.2（存疑值）',
];
const calcSteps32 = [
  '回退观察：S₃→S₂共2次',
  'S₃总出度n=20次',
  'P(S₃→S₂) = 2/20 = 0.1',
];
const calcSteps00 = ['自环：S₀保持=1-0.35-0.05=0.60'];
const calcSteps11 = ['自环：S₁保持=1-0.12-0.28-0.03=0.57'];
const calcSteps22 = ['自环：S₂保持=1-0.15-0.20-0.05=0.60（样本少不可靠）'];
const calcSteps33 = ['自环：S₃保持=1-0.10-0.02=0.88'];
const calcSteps02 = ['S₀→S₂跳跃：2/34≈0.059→取0.05'];
const calcSteps31 = ['S₃→S₁回退：0.4/20=0.02'];
const calcSteps13 = ['S₁→S₃跳跃：1/33≈0.03'];
const calcSteps21 = ['S₂→S₁回退：2.25/15=0.15'];
const calcSteps20 = ['S₂→S₀大回退：0.75/15=0.05'];

export const markovEdges: MarkovEdge[] = [
  { id: 'E00', from: 'S0', to: 'S0', probability: 0.6, isCalcVisible: false, calcSteps: calcSteps00 },
  { id: 'E01', from: 'S0', to: 'S1', probability: 0.35, isCalcVisible: true, calcSteps: calcSteps01 },
  { id: 'E02', from: 'S0', to: 'S2', probability: 0.05, isCalcVisible: false, calcSteps: calcSteps02 },
  { id: 'E10', from: 'S1', to: 'S0', probability: 0.12, isCalcVisible: false, calcSteps: calcSteps10 },
  { id: 'E11', from: 'S1', to: 'S1', probability: 0.57, isCalcVisible: false, calcSteps: calcSteps11 },
  { id: 'E12', from: 'S1', to: 'S2', probability: 0.28, isCalcVisible: true, calcSteps: calcSteps12 },
  { id: 'E13', from: 'S1', to: 'S3', probability: 0.03, isCalcVisible: false, calcSteps: calcSteps13 },
  { id: 'E20', from: 'S2', to: 'S0', probability: 0.05, isCalcVisible: false, calcSteps: calcSteps20 },
  { id: 'E21', from: 'S2', to: 'S1', probability: 0.15, isCalcVisible: false, calcSteps: calcSteps21 },
  { id: 'E22', from: 'S2', to: 'S2', probability: 0.6, isCalcVisible: false, calcSteps: calcSteps22 },
  { id: 'E23', from: 'S2', to: 'S3', probability: 0.2, isCalcVisible: true, calcSteps: calcSteps23 },
  { id: 'E31', from: 'S3', to: 'S1', probability: 0.02, isCalcVisible: false, calcSteps: calcSteps31 },
  { id: 'E32', from: 'S3', to: 'S2', probability: 0.1, isCalcVisible: false, calcSteps: calcSteps32 },
  { id: 'E33', from: 'S3', to: 'S3', probability: 0.88, isCalcVisible: false, calcSteps: calcSteps33 },
];
