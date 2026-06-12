export type ValidationStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'revoked' 
  | 'pending_materials' 
  | 'manual_override';

export type AnomalyType = 
  | 'division_by_zero' 
  | 'out_of_range' 
  | 'missing_data' 
  | 'pattern_mismatch';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type HistoryAction = 
  | 'import' 
  | 'validate' 
  | 'confirm' 
  | 'revoke' 
  | 'override' 
  | 'request_materials';

export interface StudentError {
  id: string;
  studentId: string;
  questionId: string;
  subject: string;
  score: number;
  totalScore: number;
  errorType: string;
  errorDetail: string;
  rawData: Record<string, unknown>;
  createdAt: string;
}

export interface Anomaly {
  type: AnomalyType;
  field: string;
  value: unknown;
  reason: string;
  impactScope: string[];
  severity: Severity;
}

export interface ValidationRecord {
  id: string;
  studentErrorId: string;
  studentError: StudentError;
  status: ValidationStatus;
  algorithmVersion: string;
  parameters: Record<string, unknown>;
  anomalies: Anomaly[];
  explanation: string;
  reviewer: string;
  validatedAt: string;
  updatedAt: string;
}

export interface HistoryLog {
  id: string;
  recordId: string;
  action: HistoryAction;
  operator: string;
  oldStatus: ValidationStatus | null;
  newStatus: ValidationStatus | null;
  remark: string;
  createdAt: string;
}

export interface ValidationParams {
  enableDivisionByZeroCheck: boolean;
  enableRangeCheck: boolean;
  enablePathCheck: boolean;
  pathThreshold: number;
  minScore: number;
  maxScore: number;
}

export interface PathScoreResult {
  value: number;
  isBoundary: boolean;
}

export interface AppState {
  studentErrors: StudentError[];
  validationRecords: ValidationRecord[];
  historyLogs: HistoryLog[];
  selectedRecordId: string | null;
  isValidating: boolean;
  currentAlgorithmVersion: string;
  currentOperator: string;
}

export type TabType = 'confirmed' | 'pending_materials' | 'manual_override';

export const STORAGE_KEYS = {
  STUDENT_ERRORS: 'spvc_student_errors',
  VALIDATION_RECORDS: 'spvc_validation_records',
  HISTORY_LOGS: 'spvc_history_logs',
  ALGORITHM_VERSION: 'spvc_algorithm_version',
  LAST_OPERATOR: 'spvc_last_operator',
} as const;

export const STATUS_LABELS: Record<ValidationStatus, string> = {
  pending: '待处理',
  confirmed: '已处理',
  revoked: '已撤回',
  pending_materials: '待补材料',
  manual_override: '人工改判',
};

export const STATUS_COLORS: Record<ValidationStatus, string> = {
  pending: 'bg-gray-100 text-gray-700 border-gray-300',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  revoked: 'bg-slate-100 text-slate-600 border-slate-300',
  pending_materials: 'bg-orange-50 text-orange-700 border-orange-300',
  manual_override: 'bg-violet-50 text-violet-700 border-violet-300',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '严重',
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  division_by_zero: '除零边界',
  out_of_range: '范围异常',
  missing_data: '数据缺失',
  pattern_mismatch: '路径异常',
};
