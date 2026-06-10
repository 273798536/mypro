import type {
  Sample,
  CultureRecord,
  Conclusion,
  SourceTrace,
  ImportBatch,
  CorrectionRecord,
  CalculatorConfig,
  SampleStatus
} from '@/types';

const now = new Date().toISOString();

export const mockSamples: Sample[] = [
  {
    id: 's001',
    barcode: 'BC20240601001',
    batchNo: 'BATCH-2024-06A',
    sampleType: '血液样本',
    status: 'completed' as SampleStatus,
    name: '样本A-001',
    concentration: 12.5,
    cellCount: 5600000,
    remark: '正常样本，无异常',
    createdAt: '2024-06-01T09:00:00Z',
    updatedAt: '2024-06-03T14:30:00Z'
  },
  {
    id: 's002',
    barcode: 'BC20240601002',
    batchNo: 'BATCH-2024-06A',
    sampleType: '血液样本',
    status: 'testing' as SampleStatus,
    name: '样本A-002',
    concentration: 8.3,
    cellCount: 4200000,
    remark: '培养中，第2天',
    createdAt: '2024-06-01T09:05:00Z',
    updatedAt: '2024-06-02T10:00:00Z'
  },
  {
    id: 's003',
    barcode: 'BC20240601003',
    batchNo: 'BATCH-2024-06A',
    sampleType: '尿液样本',
    status: 'pending' as SampleStatus,
    name: '样本A-003',
    remark: '待检测',
    createdAt: '2024-06-01T09:10:00Z',
    updatedAt: '2024-06-01T09:10:00Z'
  },
  {
    id: 's004',
    barcode: 'BC20240601004',
    batchNo: 'BATCH-2024-06A',
    sampleType: '唾液样本',
    status: 'abnormal' as SampleStatus,
    name: '样本A-004',
    concentration: 25.6,
    cellCount: 1200000,
    remark: '疑似污染，需复核',
    createdAt: '2024-06-01T09:15:00Z',
    updatedAt: '2024-06-02T16:45:00Z'
  },
  {
    id: 's005',
    barcode: 'BC20240602001',
    batchNo: 'BATCH-2024-06B',
    sampleType: '血液样本',
    status: 'completed' as SampleStatus,
    name: '样本B-001',
    concentration: 15.2,
    cellCount: 6100000,
    remark: '第二次导入补充数据',
    createdAt: '2024-06-02T08:30:00Z',
    updatedAt: '2024-06-04T11:20:00Z'
  },
  {
    id: 's006',
    barcode: 'BC20240602002',
    batchNo: 'BATCH-2024-06B',
    sampleType: '组织样本',
    status: 'testing' as SampleStatus,
    name: '样本B-002',
    remark: '石蜡包埋处理中',
    createdAt: '2024-06-02T08:35:00Z',
    updatedAt: '2024-06-03T09:00:00Z'
  },
  {
    id: 's007',
    barcode: 'BC20240603001',
    batchNo: 'BATCH-2024-06C',
    sampleType: '脑脊液样本',
    status: 'pending' as SampleStatus,
    name: '样本C-001',
    remark: '采集于第三医院',
    createdAt: '2024-06-03T10:00:00Z',
    updatedAt: '2024-06-03T10:00:00Z'
  },
  {
    id: 's008',
    barcode: 'BC20240603002',
    batchNo: 'BATCH-2024-06C',
    sampleType: '血液样本',
    status: 'completed' as SampleStatus,
    name: '样本C-002',
    concentration: 10.8,
    cellCount: 4900000,
    remark: '补录样本，人工复核通过',
    createdAt: '2024-06-03T14:00:00Z',
    updatedAt: '2024-06-05T09:30:00Z'
  }
];

export const mockCultureRecords: CultureRecord[] = [
  {
    id: 'cr001',
    sampleId: 's001',
    content: '初始接种，细胞密度1×10^6/mL',
    operator: '李老师',
    recordTime: '2024-06-01T09:30:00Z',
    imageName: 'img_001_day0.jpg'
  },
  {
    id: 'cr002',
    sampleId: 's001',
    content: '第1天观察，细胞贴壁良好，存活率约95%',
    operator: '李老师',
    recordTime: '2024-06-02T10:00:00Z',
    imageName: 'img_001_day1.jpg'
  },
  {
    id: 'cr003',
    sampleId: 's001',
    content: '第3天传代，细胞融合度约80%',
    operator: '王同学',
    recordTime: '2024-06-03T14:30:00Z',
    imageName: 'img_001_day3.jpg'
  },
  {
    id: 'cr004',
    sampleId: 's002',
    content: '初始接种，细胞密度0.8×10^6/mL',
    operator: '李老师',
    recordTime: '2024-06-01T09:45:00Z',
    imageName: 'img_002_day0.jpg'
  },
  {
    id: 'cr005',
    sampleId: 's002',
    content: '第2天观察，细胞生长缓慢，需继续观察',
    operator: '张同学',
    recordTime: '2024-06-02T16:00:00Z',
    imageName: 'img_002_day2.jpg'
  },
  {
    id: 'cr006',
    sampleId: 's004',
    content: '发现疑似真菌污染，标记异常',
    operator: '李老师',
    recordTime: '2024-06-02T16:45:00Z',
    imageName: 'img_004_contam.jpg'
  },
  {
    id: 'cr007',
    sampleId: 's005',
    content: '第二次导入补充，细胞计数确认',
    operator: '李老师',
    recordTime: '2024-06-02T09:00:00Z',
    imageName: 'img_005_recheck.jpg'
  }
];

export const mockConclusions: Conclusion[] = [
  {
    id: 'c001',
    sampleId: 's001',
    result: '细胞培养成功，存活率92%，可用于后续实验',
    conclusionType: '培养成功',
    reviewer: '李老师',
    reviewedAt: '2024-06-03T15:00:00Z',
    isManualCorrected: false
  },
  {
    id: 'c002',
    sampleId: 's004',
    result: '样本污染，培养失败，建议重新采样',
    conclusionType: '培养失败',
    reviewer: '李老师',
    reviewedAt: '2024-06-02T17:00:00Z',
    isManualCorrected: true,
    correctionReason: '最初判定为可疑，经复核确认污染'
  },
  {
    id: 'c003',
    sampleId: 's005',
    result: '细胞活性良好，浓度符合预期',
    conclusionType: '检测通过',
    reviewer: '王老师',
    reviewedAt: '2024-06-04T11:30:00Z',
    isManualCorrected: false
  },
  {
    id: 'c004',
    sampleId: 's008',
    result: '补录样本，数据完整，结论有效',
    conclusionType: '补录通过',
    reviewer: '李老师',
    reviewedAt: '2024-06-05T10:00:00Z',
    isManualCorrected: true,
    correctionReason: '该样本为手工补录，已核对原始记录'
  }
];

export const mockSourceTraces: SourceTrace[] = [
  { id: 'st001', sampleId: 's001', originalRow: 2, sourceFile: '2024年6月样本清单A.xlsx', sourceRemark: '第一批送检', importBatchId: 'batch001' },
  { id: 'st002', sampleId: 's002', originalRow: 3, sourceFile: '2024年6月样本清单A.xlsx', sourceRemark: '第一批送检', importBatchId: 'batch001' },
  { id: 'st003', sampleId: 's003', originalRow: 4, sourceFile: '2024年6月样本清单A.xlsx', sourceRemark: '第一批送检', importBatchId: 'batch001' },
  { id: 'st004', sampleId: 's004', originalRow: 5, sourceFile: '2024年6月样本清单A.xlsx', sourceRemark: '第一批送检', importBatchId: 'batch001' },
  { id: 'st005', sampleId: 's005', originalRow: 2, sourceFile: '2024年6月样本清单B.xlsx', sourceRemark: '第二批送检，与第一批部分重叠', importBatchId: 'batch002' },
  { id: 'st006', sampleId: 's006', originalRow: 3, sourceFile: '2024年6月样本清单B.xlsx', sourceRemark: '第二批送检', importBatchId: 'batch002' },
  { id: 'st007', sampleId: 's007', originalRow: 2, sourceFile: '2024年6月样本清单C.xlsx', sourceRemark: '第三批，第三医院采集', importBatchId: 'batch003' },
  { id: 'st008', sampleId: 's008', originalRow: 15, sourceFile: '补录样本-6月3日.xlsx', sourceRemark: '人工补录', importBatchId: 'batch004' }
];

export const mockImportBatches: ImportBatch[] = [
  { id: 'batch001', fileName: '2024年6月样本清单A.xlsx', totalCount: 12, cleanedCount: 4, duplicateCount: 8, importTime: '2024-06-01T08:00:00Z', operator: '李老师', isReimport: false },
  { id: 'batch002', fileName: '2024年6月样本清单B.xlsx', totalCount: 8, cleanedCount: 2, duplicateCount: 6, importTime: '2024-06-02T08:30:00Z', operator: '李老师', isReimport: true },
  { id: 'batch003', fileName: '2024年6月样本清单C.xlsx', totalCount: 5, cleanedCount: 1, duplicateCount: 4, importTime: '2024-06-03T09:00:00Z', operator: '王老师', isReimport: false },
  { id: 'batch004', fileName: '补录样本-6月3日.xlsx', totalCount: 1, cleanedCount: 1, duplicateCount: 0, importTime: '2024-06-03T14:00:00Z', operator: '李老师', isReimport: false }
];

export const mockCorrectionRecords: CorrectionRecord[] = [
  {
    id: 'corr001',
    sampleId: 's004',
    fieldName: '状态',
    oldValue: '检测中',
    newValue: '异常',
    operator: '李老师',
    operateTime: '2024-06-02T16:45:00Z',
    reason: '发现疑似真菌污染'
  },
  {
    id: 'corr002',
    sampleId: 's004',
    fieldName: '结论',
    oldValue: '待观察',
    newValue: '培养失败',
    operator: '李老师',
    operateTime: '2024-06-02T17:00:00Z',
    reason: '确认污染，培养失败'
  },
  {
    id: 'corr003',
    sampleId: 's008',
    fieldName: '浓度',
    oldValue: '11.2',
    newValue: '10.8',
    operator: '李老师',
    operateTime: '2024-06-05T09:30:00Z',
    reason: '复核后修正，原始记录为10.8'
  },
  {
    id: 'corr004',
    sampleId: 's005',
    fieldName: '细胞计数',
    oldValue: '5800000',
    newValue: '6100000',
    operator: '王老师',
    operateTime: '2024-06-04T11:00:00Z',
    reason: '第二次显微计数确认，修正数值'
  }
];

export const calculatorConfigs: CalculatorConfig[] = [
  {
    id: 'dilution',
    name: '浓度稀释计算',
    formula: 'C1 × V1 = C2 × V2',
    unit: 'mg/mL',
    applicableScope: '适用于液体样本的稀释配制，如蛋白溶液、试剂稀释等。要求初始浓度和最终浓度单位一致。',
    failureReasons: [
      '初始浓度为0或负数',
      '稀释倍数超过1000倍（误差过大）',
      '最终体积小于初始体积（应为稀释而非浓缩）',
      '输入值超出合理范围'
    ],
    inputFields: [
      { key: 'c1', label: '初始浓度', unit: 'mg/mL', type: 'number', defaultValue: 100 },
      { key: 'v1', label: '初始体积', unit: 'μL', type: 'number', defaultValue: 100 },
      { key: 'c2', label: '目标浓度', unit: 'mg/mL', type: 'number', defaultValue: 10 }
    ]
  },
  {
    id: 'cell-count',
    name: '细胞计数计算',
    formula: '细胞数/mL = (四大格细胞总数 / 4) × 10^4 × 稀释倍数',
    unit: 'cells/mL',
    applicableScope: '适用于血球计数板细胞计数，适用于动物细胞、微生物细胞等悬浮细胞的浓度测定。计数室深度为0.1mm。',
    failureReasons: [
      '细胞数过少（每大格<10个），统计误差大',
      '细胞数过多（每大格>300个），计数不准确',
      '稀释倍数为0或负数',
      '四大格细胞数差异超过20%，分布不均匀'
    ],
    inputFields: [
      { key: 'totalCells', label: '四大格细胞总数', unit: '个', type: 'number', defaultValue: 120 },
      { key: 'dilutionFactor', label: '稀释倍数', unit: '倍', type: 'number', defaultValue: 1 }
    ]
  },
  {
    id: 'cell-viability',
    name: '细胞存活率计算',
    formula: '存活率 = (活细胞数 / 总细胞数) × 100%',
    unit: '%',
    applicableScope: '适用于台盼蓝染色法测定细胞存活率。活细胞拒染呈无色透明，死细胞被染成蓝色。',
    failureReasons: [
      '总细胞数为0',
      '活细胞数大于总细胞数',
      '细胞总数<100，统计误差大',
      '染色时间不足或过长'
    ],
    inputFields: [
      { key: 'liveCells', label: '活细胞数', unit: '个', type: 'number', defaultValue: 180 },
      { key: 'deadCells', label: '死细胞数', unit: '个', type: 'number', defaultValue: 20 }
    ]
  }
];
