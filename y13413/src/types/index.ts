export type RecordStatus =
  | 'new'
  | 'reviewing'
  | 'approved'
  | 'skipped'
  | 'anomaly'
  | 'normal';

export type AnomalyType =
  | 'out_of_bounds'
  | 'inconsistency'
  | 'missing_value'
  | 'format_error'
  | 'extrapolation'
  | 'rule_conflict';

export type ProcessStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface BatchFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
}

export interface ComputationStep {
  step: number;
  description: string;
  formula: string;
  input: Record<string, unknown>;
  output: unknown;
  isDrivingFactor?: boolean;
  drivingFactorNote?: string;
}

export interface BoundaryValue {
  value: number;
  source?: string;
  status?: string;
  method?: string;
}

export interface ConsistencyCheck {
  pageValue: number;
  tableValue: number;
  exportValue: number;
  isConsistent: boolean;
}

export interface BoundaryCheck {
  beforeExtrapolation: BoundaryValue;
  afterExtrapolation: BoundaryValue;
  consistencyCheck: ConsistencyCheck;
}

export interface Batch {
  id: string;
  name: string;
  status: ProcessStatus;
  totalRecords: number;
  createdAt: string;
  updatedAt: string;
  files?: BatchFile[];
  newRecords?: number;
  skippedRecords?: number;
  anomalyRecords?: number;
  approvedRecords?: number;
  startedAt?: string;
  completedAt?: string;
  fileHash?: string;
  newCount?: number;
  skippedCount?: number;
  anomalyCount?: number;
}

export interface ProcessHistory {
  id: string;
  batchId: string;
  action: string;
  operator: string;
  recordId?: string;
  timestamp?: string;
  details?: string;
  summary?: string;
  createdAt?: string;
}

export interface RecordVersion {
  id: string;
  createdAt: string;
  createdBy: string;
  version?: number;
  data?: Record<string, unknown>;
  comment?: string;
  recordId?: string;
  versionNumber?: number;
  computationTrace?: ComputationStep[];
  boundaryCheck?: BoundaryCheck;
  overwriteReason?: string;
}

export interface ReviewRecord {
  id: string;
  batchId: string;
  sourceFile: string;
  status: RecordStatus;
  currentVersionId: string;
  versions: RecordVersion[];
  createdAt: string;
  recordNo?: string;
  isOutOfBounds?: boolean;
  consistencyCheck?: boolean;
  updatedAt?: string;
  recordKey?: string;
}

export interface Anomaly {
  id: string;
  recordId: string;
  batchId: string;
  type: AnomalyType;
  description: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
  field?: string;
  resolved?: boolean;
  detail?: Record<string, unknown>;
  suggestion?: string;
}

export interface ReviewRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type?: AnomalyType;
  config?: Record<string, unknown>;
  updatedAt?: string;
  threshold?: { lower: number; upper: number };
  extrapolationMethod?: string;
}
