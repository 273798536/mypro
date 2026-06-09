import type { AppState, CorrosionTestRecord, Reagent, ReagentLedger } from '../types';

const reagents: Reagent[] = [
  {
    id: 'reagent-001',
    name: '氯化钠（分析纯）',
    batchNo: 'NaCl-20260315',
    expiryDate: '2028-03-14',
    supplier: '国药集团化学试剂有限公司'
  },
  {
    id: 'reagent-002',
    name: '去离子水',
    batchNo: 'H2O-20260401',
    expiryDate: '2026-06-30',
    supplier: '实验室自制'
  }
];

const reagentLedgers: ReagentLedger[] = [
  {
    id: 'ledger-001',
    reagentId: 'reagent-001',
    testDate: '2026-04-10',
    usageAmount: 500,
    operator: '张工'
  },
  {
    id: 'ledger-002',
    reagentId: 'reagent-001',
    testDate: '2026-04-15',
    usageAmount: 450,
    operator: '李工'
  },
  {
    id: 'ledger-003',
    reagentId: 'reagent-002',
    testDate: '2026-04-10',
    usageAmount: 10000,
    operator: '张工'
  },
  {
    id: 'ledger-004',
    reagentId: 'reagent-001',
    testDate: '2026-05-05',
    usageAmount: 600,
    operator: '王工'
  }
];

const records: CorrosionTestRecord[] = [
  {
    id: 'rec-001',
    sampleName: '304不锈钢板-A1',
    batchNo: 'SS-2026-0410-001',
    testDate: '2026-04-10',
    durationHours: 48,
    rating: 9,
    operator: '张工',
    source: 'initial',
    conclusion: 'pass',
    reagentLedgerIds: ['ledger-001', 'ledger-003'],
    createdAt: '2026-04-10T10:30:00.000Z',
    updatedAt: '2026-04-10T10:30:00.000Z',
    reviewedBy: '安全员-陈',
    reviewedAt: '2026-04-11T08:00:00.000Z'
  },
  {
    id: 'rec-002',
    sampleName: '304不锈钢板-A2',
    batchNo: 'SS-2026-0410-001',
    testDate: '2026-04-12',
    durationHours: 72,
    rating: 8,
    operator: '李工',
    source: 'reimport',
    linkedRecordId: 'rec-001',
    conclusion: 'pending',
    remark: '同一批号重复导入，结论待安全员复核确认',
    reagentLedgerIds: ['ledger-002'],
    createdAt: '2026-04-12T14:20:00.000Z',
    updatedAt: '2026-04-12T14:20:00.000Z',
    isDuplicateWarning: true
  },
  {
    id: 'rec-003',
    sampleName: '铝合金6061-B1',
    batchNo: 'AL-2026-0420-003',
    testDate: '2026-04-20',
    durationHours: 24,
    rating: 6,
    operator: '张工',
    source: 'initial',
    conclusion: 'fail',
    remark: '腐蚀面积超标，判定为不通过',
    reagentLedgerIds: ['ledger-003'],
    createdAt: '2026-04-20T09:00:00.000Z',
    updatedAt: '2026-04-20T09:00:00.000Z',
    reviewedBy: '安全员-陈',
    reviewedAt: '2026-04-21T10:00:00.000Z'
  },
  {
    id: 'rec-004',
    sampleName: '镀锌钢板-C1',
    batchNo: 'ZN-2026-0501-007',
    testDate: '2026-05-01',
    durationHours: 96,
    rating: 7,
    operator: '王工',
    source: 'initial',
    conclusion: 'pass',
    reagentLedgerIds: ['ledger-004'],
    createdAt: '2026-05-01T11:15:00.000Z',
    updatedAt: '2026-05-01T11:15:00.000Z',
    reviewedBy: '安全员-陈',
    reviewedAt: '2026-05-02T09:30:00.000Z'
  },
  {
    id: 'rec-005',
    sampleName: '镀锌钢板-C1（补录）',
    batchNo: 'ZN-2026-0501-007',
    testDate: '2026-05-03',
    durationHours: 120,
    rating: 8,
    operator: '王工',
    source: 'supplement',
    linkedRecordId: 'rec-004',
    conclusion: 'confirmed',
    remark: '延长试验时间补录数据，已确认最终评级为8级',
    reagentLedgerIds: ['ledger-004'],
    createdAt: '2026-05-03T16:45:00.000Z',
    updatedAt: '2026-05-03T16:45:00.000Z',
    reviewedBy: '安全员-陈',
    reviewedAt: '2026-05-04T08:30:00.000Z'
  },
  {
    id: 'rec-006',
    sampleName: '铜合金-D1',
    batchNo: 'CU-2026-0515-012',
    testDate: '2026-05-15',
    durationHours: 48,
    rating: 10,
    operator: '李工',
    source: 'initial',
    conclusion: 'pass',
    reagentLedgerIds: ['ledger-002', 'ledger-004'],
    createdAt: '2026-05-15T13:00:00.000Z',
    updatedAt: '2026-05-15T13:00:00.000Z',
    reviewedBy: '安全员-陈',
    reviewedAt: '2026-05-16T10:00:00.000Z'
  },
  {
    id: 'rec-007',
    sampleName: '镁合金-E1',
    batchNo: 'MG-2026-0601-002',
    testDate: '2026-06-01',
    durationHours: 24,
    rating: 4,
    operator: '张工',
    source: 'initial',
    conclusion: 'pending',
    remark: '缺少试剂台账记录，请补充对应批次的氯化钠使用记录',
    reagentLedgerIds: [],
    createdAt: '2026-06-01T09:30:00.000Z',
    updatedAt: '2026-06-01T09:30:00.000Z'
  }
];

export const sampleAppState: AppState = {
  records,
  reagents,
  reagentLedgers,
  initialized: true,
  lastSafetyReviewDate: '2026-05-31'
};
