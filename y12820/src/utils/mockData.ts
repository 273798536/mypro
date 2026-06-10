import {
  Sample,
  SampleStatus,
  QualityLevel,
  QCRecord,
  Group,
  PathologyNote,
  ManualCorrection,
  SampleVersion,
  DifferentialAnalysis,
  AnalysisResult,
  BarcodeConflict,
} from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

const sampleNames = [
  '野生型-叶片01', '野生型-叶片02', '野生型-叶片03',
  '突变体A-叶片01', '突变体A-叶片02', '突变体A-叶片03',
  '处理组-光照01', '处理组-光照02', '处理组-光照03',
  '对照组-常温01', '对照组-常温02', '对照组-常温03',
  '胁迫组-干旱01', '胁迫组-干旱02', '胁迫组-干旱03',
];

const materials = ['拟南芥叶片', '水稻叶片', '玉米叶片', '小麦叶片', '烟草叶片'];
const collectors = ['张检验师', '李检验师', '王检验师', '赵检验师'];

export const mockSamples: Sample[] = sampleNames.map((name, index) => ({
  id: `S${String(index + 1).padStart(3, '0')}`,
  barcode: `BC${String(index + 1).padStart(3, '0')}`,
  name,
  material: materials[index % materials.length],
  collector: collectors[index % collectors.length],
  collectionTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
  status: [SampleStatus.AVAILABLE, SampleStatus.AVAILABLE, SampleStatus.REVIEWING, SampleStatus.INVALID][index % 4],
  qualityLevel: [QualityLevel.A, QualityLevel.B, QualityLevel.C, QualityLevel.D][index % 4],
  groupId: index < 8 ? (index < 4 ? 'G001' : 'G002') : undefined,
  invalidReason: index % 4 === 3 ? '低质量读段占比过高' : undefined,
  createdAt: new Date(),
  createdBy: '系统初始化',
  updatedAt: new Date(),
  updatedBy: '系统初始化',
}));

export const mockQCRecords: QCRecord[] = mockSamples.map((sample, index) => {
  const qcScore = 35 + Math.random() * 20;
  const readQuality = 25 + Math.random() * 15;
  const lowQualityReads = Math.floor(Math.random() * 5000);
  const totalReads = 50000 + Math.floor(Math.random() * 50000);
  const isLowQuality = qcScore < 30 || readQuality < 20 || (lowQualityReads / totalReads) > 0.2;
  const reasons: string[] = [];
  if (qcScore < 30) reasons.push('质控分数低于阈值');
  if (readQuality < 20) reasons.push('读段质量低于阈值');
  if (lowQualityReads / totalReads > 0.2) reasons.push('低质量读段占比超过20%');

  return {
    id: `QC${String(index + 1).padStart(3, '0')}`,
    sampleId: sample.id,
    qcScore,
    readQuality,
    lowQualityReads,
    totalReads,
    sourceMaterial: `材料批次: BAT${String(2024001 + index).padStart(7, '0')}`,
    equipment: `叶绿素荧光仪-FM${String(100 + (index % 5)).padStart(3, '0')}`,
    operator: collectors[index % collectors.length],
    testTime: new Date(sample.collectionTime.getTime() + 24 * 60 * 60 * 1000),
    conclusion: isLowQuality ? '质量不合格，建议复核' : '质量合格',
    isLowQuality,
    filterReasons: reasons,
  };
});

export const mockGroups: Group[] = [
  {
    id: 'G001',
    name: '对照组',
    type: 'control',
    description: '正常生长条件下的野生型样本',
    createdBy: '张检验师',
    sampleIds: mockSamples.filter((_, i) => i < 4).map(s => s.id),
  },
  {
    id: 'G002',
    name: '实验组',
    type: 'experimental',
    description: '光照胁迫处理下的突变体样本',
    createdBy: '张检验师',
    sampleIds: mockSamples.filter((_, i) => i >= 4 && i < 8).map(s => s.id),
  },
];

export const mockPathologyNotes: PathologyNote[] = [
  {
    id: 'N001',
    sampleId: 'S001',
    barcode: 'BC001',
    content: '叶片形态正常，叶绿体结构完整，无明显病理特征。',
    pathologist: '李医师',
    noteTime: new Date(),
    isConflict: false,
  },
  {
    id: 'N002',
    sampleId: 'S002',
    barcode: 'BC002',
    content: '发现少量黄化斑点，可能与光照强度有关，建议进一步检测。',
    pathologist: '李医师',
    noteTime: new Date(),
    isConflict: false,
  },
  {
    id: 'N003',
    sampleId: 'S003',
    barcode: 'BC003',
    content: '备注存在冲突，需要检验师复核确认。',
    pathologist: '王医师',
    noteTime: new Date(),
    isConflict: true,
  },
  {
    id: 'N004',
    sampleId: 'S004',
    barcode: 'BC004',
    content: '样本处理过程中发现污染迹象，已标记待复核。',
    pathologist: '李医师',
    noteTime: new Date(),
    isConflict: true,
  },
];

export const mockManualCorrections: ManualCorrection[] = [
  {
    id: 'C001',
    sampleId: 'S001',
    fieldName: 'qualityLevel',
    oldValue: 'B',
    newValue: 'A',
    reason: '复核后确认数据质量优秀，上调等级',
    corrector: '张检验师',
    correctedAt: new Date(),
    isRollback: false,
  },
  {
    id: 'C002',
    sampleId: 'S002',
    fieldName: 'material',
    oldValue: '水稻叶片',
    newValue: '拟南芥叶片',
    reason: '材料登记错误，已核实纠正',
    corrector: '李检验师',
    correctedAt: new Date(),
    isRollback: false,
  },
];

export const mockSampleVersions: SampleVersion[] = mockSamples.slice(0, 3).map((sample, index) => ({
  id: `V${String(index + 1).padStart(3, '0')}`,
  sampleId: sample.id,
  version: 1,
  data: { ...sample, qualityLevel: QualityLevel.B },
  changeReason: '初始导入',
  operator: '系统初始化',
  createdAt: new Date(sample.createdAt.getTime() - 1000),
}));

export const mockAnalysis: DifferentialAnalysis = {
  id: 'A001',
  name: '光照胁迫差异分析',
  controlGroupId: 'G001',
  experimentalGroupId: 'G002',
  method: 't检验',
  pValueThreshold: 0.05,
  foldChangeThreshold: 1.5,
  status: 'completed',
  createdAt: new Date(),
  createdBy: '张检验师',
  completedAt: new Date(),
};

export const mockAnalysisResults: AnalysisResult[] = mockSamples.filter(s => s.groupId).map((sample, index) => {
  const log2FoldChange = (Math.random() - 0.5) * 4;
  const pValue = Math.random() * 0.1;
  const isSignificant = pValue < 0.05 && Math.abs(log2FoldChange) > Math.log2(1.5);
  const regulation = isSignificant
    ? (log2FoldChange > 0 ? 'up' : 'down')
    : 'none';

  return {
    id: `R${String(index + 1).padStart(3, '0')}`,
    analysisId: 'A001',
    sampleId: sample.id,
    log2FoldChange,
    pValue,
    adjustedPValue: pValue * 1.2,
    isSignificant,
    regulation,
  };
});

export const mockBarcodeConflicts: BarcodeConflict[] = [
  {
    barcode: 'BC001',
    samples: [
      mockSamples[0],
      {
        ...mockSamples[0],
        id: 'S001-DUP',
        name: '野生型-叶片01-重复导入',
        collector: '李检验师',
        collectionTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        createdBy: '测试导入',
        updatedAt: new Date(),
        updatedBy: '测试导入',
      },
    ],
    detectedAt: new Date(),
  },
];

export const getMockData = () => ({
  samples: mockSamples,
  qcRecords: mockQCRecords,
  groups: mockGroups,
  pathologyNotes: mockPathologyNotes,
  manualCorrections: mockManualCorrections,
  sampleVersions: mockSampleVersions,
  analysis: mockAnalysis,
  analysisResults: mockAnalysisResults,
  barcodeConflicts: mockBarcodeConflicts,
});

export { generateId };
