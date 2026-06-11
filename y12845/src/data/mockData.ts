import type { Batch, Sample, CorrectionRecord, PathologyNote } from '@/types';

const batchEffectExplanations: Record<string, string> = {
  'batch-001': '本批次批次效应得分为0.82，处于正常范围内（阈值0.75-0.90）。各组内变异系数均低于15%，说明实验重复性良好，数据可靠。',
  'batch-002': '批次效应得分0.68，低于建议阈值0.75。主要原因是对照组第3孔存活率偏低（82%），可能与接种时细胞状态有关，建议复核原始图片。',
  'batch-003': '批次效应得分0.91，略高于上限0.90。高浓度组间差异缩小，提示可能存在药物梯度稀释误差，需要与配制记录核对。',
  'batch-004': '批次效应得分0.55，明显异常。经复核发现2个污染样本已标记剔除，剔除后得分回升至0.78，处于可接受范围。',
};

export const mockBatches: Batch[] = [
  {
    id: 'batch-001',
    name: '2024-06-ABX-G01',
    date: '2024-06-10',
    status: 'approved',
    reviewer: '张管理员',
    conclusion: '本次实验数据可靠，各浓度梯度抑菌效果呈剂量依赖性。高浓度组（32μg/mL）抑菌率达92%，可用于后续分析。',
    batchEffectScore: 0.82,
    batchEffectExplanation: batchEffectExplanations['batch-001'],
    groupStatistics: [
      { groupName: '对照组', sampleCount: 6, avgSurvivalRate: 95.2, stdDev: 3.1, minValue: 91, maxValue: 99 },
      { groupName: '低浓度(2μg/mL)', sampleCount: 6, avgSurvivalRate: 87.5, stdDev: 4.2, minValue: 81, maxValue: 93 },
      { groupName: '中浓度(8μg/mL)', sampleCount: 6, avgSurvivalRate: 62.3, stdDev: 5.8, minValue: 54, maxValue: 71 },
      { groupName: '高浓度(32μg/mL)', sampleCount: 6, avgSurvivalRate: 18.7, stdDev: 3.5, minValue: 14, maxValue: 24 },
    ],
    pathologyNotes: [
      { id: 'pn-001', batchId: 'batch-001', content: '本批次细胞状态良好，镜下观察形态正常，无明显污染迹象。对照组细胞密度均匀。', author: '李病理', timestamp: '2024-06-11 09:30' },
      { id: 'pn-002', batchId: 'batch-001', content: '高浓度组可见明显细胞凋亡形态，与存活率数据一致。中浓度组部分细胞出现形态变化。', author: '李病理', timestamp: '2024-06-11 10:15' },
    ],
  },
  {
    id: 'batch-002',
    name: '2024-06-ABX-G02',
    date: '2024-06-12',
    status: 'needs_review',
    reviewer: '王工程师',
    conclusion: '数据存在异常波动，需动物房管理员复核后确认是否可用。',
    batchEffectScore: 0.68,
    batchEffectExplanation: batchEffectExplanations['batch-002'],
    groupStatistics: [
      { groupName: '对照组', sampleCount: 6, avgSurvivalRate: 89.5, stdDev: 8.7, minValue: 76, maxValue: 98 },
      { groupName: '低浓度(2μg/mL)', sampleCount: 6, avgSurvivalRate: 81.2, stdDev: 6.3, minValue: 72, maxValue: 90 },
      { groupName: '中浓度(8μg/mL)', sampleCount: 6, avgSurvivalRate: 58.4, stdDev: 7.9, minValue: 45, maxValue: 68 },
      { groupName: '高浓度(32μg/mL)', sampleCount: 6, avgSurvivalRate: 22.1, stdDev: 5.1, minValue: 15, maxValue: 31 },
    ],
    pathologyNotes: [
      { id: 'pn-003', batchId: 'batch-002', content: '对照组第3孔细胞密度偏低，可能是接种时操作误差导致。其余孔状态正常。', author: '李病理', timestamp: '2024-06-13 08:45' },
    ],
  },
  {
    id: 'batch-003',
    name: '2024-06-ABX-G03',
    date: '2024-06-14',
    status: 'reviewing',
    reviewer: '张管理员',
    conclusion: '复核中，待确认药物梯度稀释是否准确。',
    batchEffectScore: 0.91,
    batchEffectExplanation: batchEffectExplanations['batch-003'],
    groupStatistics: [
      { groupName: '对照组', sampleCount: 6, avgSurvivalRate: 96.8, stdDev: 2.1, minValue: 94, maxValue: 99 },
      { groupName: '低浓度(2μg/mL)', sampleCount: 6, avgSurvivalRate: 91.3, stdDev: 2.8, minValue: 87, maxValue: 95 },
      { groupName: '中浓度(8μg/mL)', sampleCount: 6, avgSurvivalRate: 71.5, stdDev: 3.2, minValue: 67, maxValue: 76 },
      { groupName: '高浓度(32μg/mL)', sampleCount: 6, avgSurvivalRate: 35.2, stdDev: 4.0, minValue: 30, maxValue: 42 },
    ],
    pathologyNotes: [],
  },
  {
    id: 'batch-004',
    name: '2024-06-ABX-G04',
    date: '2024-06-16',
    status: 'pending',
    batchEffectScore: 0.55,
    batchEffectExplanation: batchEffectExplanations['batch-004'],
    groupStatistics: [
      { groupName: '对照组', sampleCount: 6, avgSurvivalRate: 78.3, stdDev: 12.5, minValue: 55, maxValue: 94 },
      { groupName: '低浓度(2μg/mL)', sampleCount: 6, avgSurvivalRate: 72.1, stdDev: 10.3, minValue: 58, maxValue: 86 },
      { groupName: '中浓度(8μg/mL)', sampleCount: 6, avgSurvivalRate: 51.4, stdDev: 8.6, minValue: 38, maxValue: 63 },
      { groupName: '高浓度(32μg/mL)', sampleCount: 6, avgSurvivalRate: 25.8, stdDev: 6.7, minValue: 15, maxValue: 36 },
    ],
    pathologyNotes: [],
  },
];

function generateSamplesForBatch(batchId: string, batchIndex: number): Sample[] {
  const groups = ['对照组', '低浓度(2μg/mL)', '中浓度(8μg/mL)', '浓度(8μg/mL)', '高浓度(32μg/mL)'];
  const realGroups = ['对照组', '低浓度(2μg/mL)', '中浓度(8μg/mL)', '高浓度(32μg/mL)'];
  const samples: Sample[] = [];
  let rowOffset = batchIndex * 24 + 1;

  const survivalRates: Record<string, number[]> = {
    'batch-001': [95, 98, 91, 97, 93, 97, 89, 92, 85, 91, 83, 88, 65, 71, 58, 62, 54, 63, 21, 18, 24, 15, 19, 17],
    'batch-002': [98, 94, 76, 92, 89, 88, 87, 83, 77, 90, 72, 78, 62, 68, 51, 45, 65, 59, 31, 25, 18, 22, 15, 21],
    'batch-003': [97, 99, 95, 96, 94, 99, 93, 95, 87, 92, 90, 91, 74, 76, 69, 71, 67, 72, 38, 42, 33, 30, 35, 33],
    'batch-004': [94, 55, 92, 89, 86, 94, 86, 75, 58, 82, 73, 60, 63, 55, 45, 38, 58, 50, 36, 28, 15, 22, 31, 25],
  };

  const sourceNotes = [
    '来自C57BL/6小鼠脾细胞，编号SP-2024-0610-A',
    '来自BALB/c小鼠骨髓细胞，编号BM-2024-0612-B',
    '来自SD大鼠原代肝细胞，编号LH-2024-0614-A',
    '来自ICR小鼠肾细胞，编号KC-2024-0616-C',
  ];

  const rates = survivalRates[batchId] || survivalRates['batch-001'];
  const sourceNote = sourceNotes[batchIndex] || sourceNotes[0];

  for (let i = 0; i < 24; i++) {
    const groupIdx = Math.floor(i / 6);
    const groupName = realGroups[groupIdx] || realGroups[0];
    const concentrations = [0, 2, 8, 32];
    const concentration = concentrations[groupIdx] || 0;

    const sample: Sample = {
      id: `${batchId}-sample-${String(i + 1).padStart(3, '0')}`,
      batchId,
      sampleId: `${batchId.split('-')[1]}-${String(i + 1).padStart(3, '0')}`,
      originalRowNumber: rowOffset + i,
      groupName,
      concentration,
      survivalRate: rates[i],
      imageName: `well_${String(Math.floor(i / 6) + 1)}_${String((i % 6) + 1)}.tif`,
      sourceNote,
      status: 'normal',
    };

    if (batchId === 'batch-002' && i === 2) {
      sample.status = 'corrected';
      sample.correctionHistory = [
        {
          id: 'corr-001',
          fieldName: 'survivalRate',
          oldValue: 85,
          newValue: 76,
          reason: '原始图像识别有误，人工复核后修正，见well_1_3.tif',
          operator: '张管理员',
          timestamp: '2024-06-13 14:20',
        },
      ];
    }

    if (batchId === 'batch-004' && (i === 1 || i === 8)) {
      sample.status = 'contaminated';
      sample.contaminationReason = i === 1 ? '真菌污染，菌丝体可见，样本作废' : '细菌污染，培养基浑浊，样本作废';
    }

    samples.push(sample);
  }

  return samples;
}

export const mockSamples: Sample[] = [
  ...generateSamplesForBatch('batch-001', 0),
  ...generateSamplesForBatch('batch-002', 1),
  ...generateSamplesForBatch('batch-003', 2),
  ...generateSamplesForBatch('batch-004', 3),
];

export function getBatchById(id: string): Batch | undefined {
  return mockBatches.find(b => b.id === id);
}

export function getSamplesByBatchId(batchId: string): Sample[] {
  return mockSamples.filter(s => s.batchId === batchId);
}

export function getSampleById(id: string): Sample | undefined {
  return mockSamples.find(s => s.id === id);
}
