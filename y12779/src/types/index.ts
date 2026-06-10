export type BatchStatus = 'success' | 'pending' | 'failed';

export type TrackingType = 'create' | 'update' | 'supplement' | 'status_change';

export type SuggestionLevel = 'release' | 'retest' | 'discard';

export interface ReactionCondition {
  temperature: number;
  pressure: number;
  catalystType: string;
  catalystLoading: number;
  solvent: string;
  reactionTime: number;
  catalystBatchNo?: string;
  repeatExperimentResult?: string;
}

export interface TrackingRecord {
  id: string;
  timestamp: string;
  type: TrackingType;
  operator: string;
  content: string;
  beforeData?: Partial<BatchReport>;
  afterData?: Partial<BatchReport>;
}

export interface RetestSuggestion {
  level: SuggestionLevel;
  reason: string;
  suggestedConditions?: Partial<ReactionCondition>;
  supplementRequired: string[];
  generatedAt: string;
}

export interface BatchReport {
  id: string;
  batchNo: string;
  date: string;
  researcher: string;
  targetCompound: string;
  selectivity: number;
  selectivityThreshold: number;
  hasBlankControl: boolean;
  blankControlNote?: string;
  conditions: ReactionCondition;
  status: BatchStatus;
  manualNote?: string;
  retestSuggestion?: RetestSuggestion;
  tracking: TrackingRecord[];
  blockerReasons?: string[];
}

export interface ReportStats {
  total: number;
  successCount: number;
  pendingCount: number;
  failedCount: number;
  passRate: number;
  avgSelectivity: number;
}
