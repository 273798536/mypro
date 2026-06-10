import type {
  Batch, WeighingRow, ExperimentRecord, ReactionTime,
  ReviewItem, CalculationResult, TimelineEvent
} from '@/types';

export const MOCK_BATCH: Batch = {
  id: 'batch-20260610-01',
  name: 'YH20260610-01',
  operator: '张同学',
  createdAt: '2026-06-10 09:30:00',
  status: '待复核',
  sourceNote: '物理化学实验课-第3组-燃烧热测定-苯甲酸样品',
};

export const MOCK_WEIGHING_ROWS: WeighingRow[] = [
  {
    id: 'w-1', batchId: 'batch-20260610-01', originalRowNumber: 1,
    sampleName: '苯甲酸(标准样)', sampleMass: 1.0245, benzoicAcidMass: 0.5012,
    imageName: 'weighing-sheet-01.jpg', remark: '十万分之一天平，已去皮',
  },
  {
    id: 'w-2', batchId: 'batch-20260610-01', originalRowNumber: 2,
    sampleName: '苯甲酸(平行样1)', sampleMass: 0.9876, benzoicAcidMass: 0.4988,
    imageName: 'weighing-sheet-01.jpg', remark: '',
  },
  {
    id: 'w-3', batchId: 'batch-20260610-01', originalRowNumber: 3,
    sampleName: '苯甲酸(平行样2)', sampleMass: 1.6234, benzoicAcidMass: 0.5023,
    imageName: 'weighing-sheet-01.jpg', remark: '质量偏大，怀疑记录时看错砝码',
  },
  {
    id: 'w-4', batchId: 'batch-20260610-01', originalRowNumber: 4,
    sampleName: '未知样品A', sampleMass: 1.0056, benzoicAcidMass: null,
    imageName: 'weighing-sheet-02.jpg', remark: '药化合成产物',
  },
  {
    id: 'w-5', batchId: 'batch-20260610-01', originalRowNumber: 5,
    sampleName: '未知样品A(平行)', sampleMass: 0.9987, benzoicAcidMass: null,
    imageName: 'weighing-sheet-02.jpg', remark: '',
  },
  {
    id: 'w-6', batchId: 'batch-20260610-01', originalRowNumber: 6,
    sampleName: '点火丝', sampleMass: 0.0123, benzoicAcidMass: null,
    imageName: 'weighing-sheet-02.jpg', remark: 'Fe-Cr合金丝，1400J/g',
  },
];

export const MOCK_EXPERIMENT_RECORDS: ExperimentRecord[] = [
  {
    id: 'e-1', batchId: 'batch-20260610-01', originalRowNumber: 1,
    initialTemp: 23.456, finalTemp: 25.987, tempChange: 2.531,
    blankControl: '有', imageName: 'temp-curve-01.png', remark: '标准样测定',
  },
  {
    id: 'e-2', batchId: 'batch-20260610-01', originalRowNumber: 2,
    initialTemp: 23.501, finalTemp: 26.012, tempChange: 2.511,
    blankControl: '缺失', imageName: 'temp-curve-02.png', remark: '忘记做空白对照实验',
  },
  {
    id: 'e-3', batchId: 'batch-20260610-01', originalRowNumber: 3,
    initialTemp: 23.478, finalTemp: 25.823, tempChange: 2.345,
    blankControl: '有', imageName: 'temp-curve-03.png', remark: '未知样品A',
  },
];

export const MOCK_REACTION_TIMES: ReactionTime[] = [
  {
    id: 'rt-1', batchId: 'batch-20260610-01', originalRowNumber: 1,
    ignitionTime: 8, totalDuration: 24, isMissing: false,
    remark: '燃烧正常，观察到完全燃烧',
  },
  {
    id: 'rt-2', batchId: 'batch-20260610-01', originalRowNumber: 2,
    ignitionTime: null, totalDuration: null, isMissing: true,
    remark: '秒表忘记录了，记不清具体时间',
  },
  {
    id: 'rt-3', batchId: 'batch-20260610-01', originalRowNumber: 3,
    ignitionTime: 10, totalDuration: 28, isMissing: false,
    remark: '',
  },
];

export const MOCK_REVIEW_ITEMS: ReviewItem[] = [
  {
    id: 'rv-1', batchId: 'batch-20260610-01', category: '实验记录',
    itemName: '空白对照缺失检查', status: '待复核',
    reason: '第2组实验未做空白对照，温度校正值可能不准确',
    reviewer: '', reviewedAt: '', sourceRef: '实验记录第2行 / 图片:temp-curve-02.png',
    errorCode: 'E001',
  },
  {
    id: 'rv-2', batchId: 'batch-20260610-01', category: '反应时间',
    itemName: '反应时间漏记检查', status: '待复核',
    reason: '第2组点火时间和总燃烧时间均未记录',
    reviewer: '', reviewedAt: '', sourceRef: '反应时间第2行',
    errorCode: 'E003',
  },
  {
    id: 'rv-3', batchId: 'batch-20260610-01', category: '称量单',
    itemName: '称量质量范围检查', status: '待复核',
    reason: '第3行样品质量1.6234g超出0.5~1.5g范围',
    reviewer: '', reviewedAt: '', sourceRef: '称量单第3行 / 图片:weighing-sheet-01.jpg',
    errorCode: 'E004',
  },
];

export const MOCK_CALCULATION_RESULTS: CalculationResult[] = [
  {
    id: 'c-1', batchId: 'batch-20260610-01', type: '燃烧热',
    value: 26435.67, unit: 'J/g',
    formula: 'Qv = [W × (tn - t0 + Δt) - q × m] / M',
    scope: '恒容条件，样品质量0.5~1.5g',
    grade: '通过', suggestion: '结果在理论值±5%范围内，可直接使用',
    details: { '水当量W': 14500, '温度变化ΔT': 2.531, '校正值Δt': 0.015 },
  },
  {
    id: 'c-2', batchId: 'batch-20260610-01', type: '燃烧热',
    value: 27845.32, unit: 'J/g',
    formula: 'Qv = [W × (tn - t0 + Δt) - q × m] / M',
    scope: '恒容条件，样品质量0.5~1.5g（空白对照缺失，结果仅供参考）',
    grade: '必须复核',
    suggestion: '空白对照缺失导致结果偏高约5.2%，必须由研究员确认是否可用历史空白数据补偿',
    details: { '水当量W': 14500, '温度变化ΔT': 2.511, '校正值Δt': 0 },
  },
];

export const MOCK_TIMELINE: TimelineEvent[] = [
  {
    id: 'tl-1', batchId: 'batch-20260610-01', type: '录入',
    description: '张同学提交称量单6行数据',
    operator: '张同学', timestamp: '2026-06-10 09:45:00',
    sourceRef: '图片:weighing-sheet-01.jpg, weighing-sheet-02.jpg',
  },
  {
    id: 'tl-2', batchId: 'batch-20260610-01', type: '录入',
    description: '提交实验记录3组，检测到1处空白对照缺失',
    operator: '张同学', timestamp: '2026-06-10 09:52:00',
    sourceRef: '实验记录第2行',
  },
  {
    id: 'tl-3', batchId: 'batch-20260610-01', type: '录入',
    description: '提交反应时间3组，检测到1处漏记',
    operator: '张同学', timestamp: '2026-06-10 09:55:00',
    sourceRef: '反应时间第2行',
  },
  {
    id: 'tl-4', batchId: 'batch-20260610-01', type: '计算',
    description: '完成2组燃烧热计算，1组通过，1组必须复核',
    operator: '系统', timestamp: '2026-06-10 09:56:00',
    sourceRef: '计算结果c-1, c-2',
  },
  {
    id: 'tl-5', batchId: 'batch-20260610-01', type: '复核',
    description: '自动生成3项待复核检查项',
    operator: '系统', timestamp: '2026-06-10 09:56:00',
    sourceRef: '复核项rv-1, rv-2, rv-3',
  },
];
