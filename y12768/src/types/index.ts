export type CorrosionRating = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type ConclusionStatus = 'pass' | 'fail' | 'pending' | 'confirmed';

export type RecordSource = 'initial' | 'supplement' | 'reimport';

export interface Reagent {
  id: string;
  name: string;
  batchNo: string;
  expiryDate: string;
  supplier: string;
}

export interface ReagentLedger {
  id: string;
  reagentId: string;
  testDate: string;
  usageAmount: number;
  operator: string;
  remark?: string;
}

export interface CorrosionTestRecord {
  id: string;
  sampleName: string;
  batchNo: string;
  testDate: string;
  durationHours: number;
  rating: CorrosionRating;
  operator: string;
  source: RecordSource;
  linkedRecordId?: string;
  conclusion: ConclusionStatus;
  remark?: string;
  reagentLedgerIds: string[];
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  isDuplicateWarning?: boolean;
}

export interface DuplicateBatchInfo {
  batchNo: string;
  recordIds: string[];
  affectedConclusions: string[];
  firstRecordDate: string;
  latestRecordDate: string;
  hasConflictingConclusions: boolean;
}

export interface AppState {
  records: CorrosionTestRecord[];
  reagents: Reagent[];
  reagentLedgers: ReagentLedger[];
  initialized: boolean;
  lastSafetyReviewDate?: string;
}

export interface ExportReport {
  generatedAt: string;
  summary: {
    totalRecords: number;
    passCount: number;
    failCount: number;
    pendingCount: number;
    duplicateCount: number;
  };
  records: CorrosionTestRecord[];
  duplicates: DuplicateBatchInfo[];
}

export const RATING_DESCRIPTIONS: Record<CorrosionRating, string> = {
  0: '无可见腐蚀',
  1: '极微量腐蚀点（< 0.1% 面积）',
  2: '微量腐蚀（0.1% ~ 0.25% 面积）',
  3: '轻度腐蚀（0.25% ~ 0.5% 面积）',
  4: '中度腐蚀（0.5% ~ 1% 面积）',
  5: '较明显腐蚀（1% ~ 2.5% 面积）',
  6: '明显腐蚀（2.5% ~ 5% 面积）',
  7: '较严重腐蚀（5% ~ 10% 面积）',
  8: '严重腐蚀（10% ~ 25% 面积）',
  9: '很严重腐蚀（25% ~ 50% 面积）',
  10: '极严重腐蚀（> 50% 面积）'
};

export const STATUS_LABELS: Record<ConclusionStatus, string> = {
  pass: '通过',
  fail: '不通过',
  pending: '待确认',
  confirmed: '已确认'
};

export const STATUS_COLORS: Record<ConclusionStatus, string> = {
  pass: '#22c55e',
  fail: '#ef4444',
  pending: '#f59e0b',
  confirmed: '#3b82f6'
};

export const SOURCE_LABELS: Record<RecordSource, string> = {
  initial: '初始录入',
  supplement: '补录',
  reimport: '重复导入'
};
