import type {
  BatchRecord,
  Reagent,
  WeighingRecord,
  HandlingOpinion,
  Anomaly,
  SafetyNote,
} from '../types';

export const MOCK_WEIGHING_RECORDS: WeighingRecord[] = [
  {
    id: 'weigh-001',
    recordNumber: 'WL-2026-0601-001',
    operator: '张三',
    weight: 5.844,
    weighedAt: new Date('2026-06-01T09:30:00').getTime(),
    remarks: '使用分析天平称量，室温25°C',
  },
  {
    id: 'weigh-002',
    recordNumber: 'WL-2026-0601-002',
    operator: '李四',
    weight: 10.110,
    weighedAt: new Date('2026-06-01T10:15:00').getTime(),
    remarks: '硝酸钾样品，注意防潮',
  },
  {
    id: 'weigh-003',
    recordNumber: 'WL-2026-0601-003',
    operator: '王五',
    weight: 2.497,
    weighedAt: new Date('2026-06-01T11:00:00').getTime(),
    remarks: '硫酸铜五水合物',
  },
  {
    id: 'weigh-004',
    recordNumber: 'WL-2026-0601-004',
    operator: '赵六',
    weight: 0.741,
    weighedAt: new Date('2026-06-01T14:20:00').getTime(),
    remarks: '氢氧化钙，称量时避免接触二氧化碳',
  },
];

export const MOCK_HANDLING_OPINIONS: HandlingOpinion[] = [
  {
    id: 'op-001',
    content: 'pH值异常偏高，已重新校准pH电极并复测，确认原因为电极未及时校准。复测结果pH=7.12，正常。建议加强仪器日常维护。',
    handler: '质检主任-陈工',
    handledAt: new Date('2026-06-02T10:00:00').getTime(),
    status: 'approved',
  },
  {
    id: 'op-002',
    content: '浓度值偏高为录入错误，实际应为1.0 mol/L（误填为10.0）。已更正原始记录，并对录入人员进行培训。',
    handler: '质检主任-陈工',
    handledAt: new Date('2026-06-02T11:30:00').getTime(),
    status: 'approved',
  },
];

export const MOCK_REAGENTS: Reagent[] = [
  {
    id: 'reagent-001',
    name: '氯化钠',
    formula: 'NaCl',
    molarMass: 58.44,
    concentration: 0.1,
    concentrationUnit: 'mol/L',
    temperature: 25,
    phValue: 7.0,
    weighingRecordId: 'weigh-001',
    weighingRecord: MOCK_WEIGHING_RECORDS[0],
  },
  {
    id: 'reagent-002',
    name: '硝酸钾',
    formula: 'KNO3',
    molarMass: 101.10,
    concentration: 10.0,
    concentrationUnit: 'mol/L',
    temperature: 25,
    phValue: 15.2,
    weighingRecordId: 'weigh-002',
    weighingRecord: MOCK_WEIGHING_RECORDS[1],
  },
  {
    id: 'reagent-003',
    name: '硫酸铜',
    formula: 'CuSO4',
    molarMass: 159.61,
    concentration: 100,
    concentrationUnit: 'g/L',
    temperature: 25,
    phValue: 4.5,
    weighingRecordId: 'weigh-003',
    weighingRecord: MOCK_WEIGHING_RECORDS[2],
  },
  {
    id: 'reagent-004',
    name: '氢氧化钙',
    formula: 'Ca(OH)2',
    molarMass: 74.09,
    concentration: 0.02,
    concentrationUnit: 'mol/L',
    temperature: 25,
    phValue: 12.4,
    weighingRecordId: 'weigh-004',
    weighingRecord: MOCK_WEIGHING_RECORDS[3],
  },
];

export const MOCK_SAFETY_NOTES: SafetyNote[] = [
  {
    id: 'note-001',
    contentHash: '',
    content: '本批次实验在标准大气压下进行，室温控制在25±1°C。所有试剂均为分析纯级别。',
    author: '张三',
    createdAt: new Date('2026-06-01T08:00:00').getTime(),
  },
  {
    id: 'note-002',
    contentHash: '',
    content: '硝酸钾样品称量时发现轻微吸潮，已在计算中予以标注。建议下次使用前烘干处理。',
    author: '李四',
    createdAt: new Date('2026-06-01T10:30:00').getTime(),
  },
];

export const MOCK_ANOMALIES: Anomaly[] = [
  {
    id: 'anomaly-001',
    reagentId: 'reagent-002',
    type: 'ph_out_of_range',
    severity: 'critical',
    description: 'pH值15.2超出理论范围[0, 14]',
    userFriendlyMessage: 'pH值为15.2，已超出水溶液理论最大值14。可能原因：电极校准偏差或录入笔误，请立即检查测量设备和原始记录。',
    actualValue: 15.2,
    expectedMin: 0,
    expectedMax: 14,
    handlingOpinionId: 'op-001',
    handlingOpinion: MOCK_HANDLING_OPINIONS[0],
  },
  {
    id: 'anomaly-002',
    reagentId: 'reagent-002',
    type: 'concentration_error',
    severity: 'error',
    description: '摩尔浓度10.0 mol/L异常偏高',
    userFriendlyMessage: '硝酸钾的摩尔浓度为10.0 mol/L，远超常见物质的溶解度上限。可能原因：单位选择错误（应为g/L）或小数点位置错误，请核对实验记录。',
    actualValue: 10.0,
    expectedMax: 50,
    handlingOpinionId: 'op-002',
    handlingOpinion: MOCK_HANDLING_OPINIONS[1],
  },
  {
    id: 'anomaly-003',
    reagentId: 'reagent-004',
    type: 'ph_out_of_range',
    severity: 'warning',
    description: 'pH值12.4超出常用范围[2, 12]',
    userFriendlyMessage: 'pH值为12.40，偏高，超出常用范围2-12。虽然仍在理论范围内，但建议检查试剂浓度是否配制准确。',
    actualValue: 12.4,
    expectedMin: 2,
    expectedMax: 12,
  },
];

export function createMockBatch(): BatchRecord {
  return {
    id: 'batch-20260601-001',
    name: '2026年6月常规溶解度测定批次',
    createdAt: new Date('2026-06-01T08:00:00').getTime(),
    updatedAt: new Date('2026-06-01T16:00:00').getTime(),
    operator: '张三',
    reagents: MOCK_REAGENTS,
    safetyNotes: MOCK_SAFETY_NOTES.map((n) => ({
      ...n,
      contentHash: generateHash(n.content + 'batch-20260601-001'),
    })),
    status: 'has_anomaly',
  };
}

export function generateHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export const MOCK_BATCHES: BatchRecord[] = [
  createMockBatch(),
  {
    id: 'batch-20260515-002',
    name: '2026年5月溶解度验证批次',
    createdAt: new Date('2026-05-15T09:00:00').getTime(),
    updatedAt: new Date('2026-05-15T17:00:00').getTime(),
    operator: '李四',
    reagents: [MOCK_REAGENTS[0], MOCK_REAGENTS[2]],
    safetyNotes: [],
    status: 'completed',
  },
];
