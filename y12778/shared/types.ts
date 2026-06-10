export interface TemperatureCurve {
  id: string;
  temperature: number;
  points: { tension: number; concentration: number }[];
  source: 'calibration' | 'literature' | 'supplement';
  measuredAt?: string;
}

export interface SupplementRecord {
  id: string;
  fieldName: string;
  oldValue?: string;
  newValue: string;
  supplementedBy: string;
  supplementedAt: string;
  reason: string;
}

export interface Reagent {
  id: string;
  batchNo: string;
  name: string;
  nominalConcentration: number;
  actualConcentration?: number;
  temperatureCurves: TemperatureCurve[];
  supplier?: string;
  productionDate?: string;
  expiryDate?: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  isSupplemented: boolean;
  supplementHistory: SupplementRecord[];
  status: 'active' | 'superseded' | 'archived';
  supersededById?: string;
}

export type CalculationStatus = 'pending' | 'passed' | 'rejected' | 'error';

export type OperationalErrorCode =
  | 'MISSING_TEMPERATURE_CURVE'
  | 'INVALID_INPUT'
  | 'REAGENT_NOT_FOUND'
  | 'DUPLICATE_CONCLUSION';

export interface OperationalError {
  code: OperationalErrorCode;
  title: string;
  actionableSteps: string[];
  relatedResource?: {
    type: 'reagent' | 'batch' | 'temperature-curve';
    id?: string;
    batchNo?: string;
    temperature?: number;
    navigationPath?: string;
  };
}

export interface CalculationExplanation {
  summary: string;
  detail: string;
  factors: {
    name: string;
    value: string;
    impact: 'high' | 'medium' | 'low';
  }[];
}

export type TraceLinkType =
  | 'result'
  | 'calculation'
  | 'raw-data'
  | 'reagent-entry'
  | 'supplement'
  | 'audit';

export interface TraceLink {
  id: string;
  type: TraceLinkType;
  title: string;
  description: string;
  timestamp: string;
  operator?: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
}

export interface Calculation {
  id: string;
  reagentId: string;
  reagentBatchNo: string;
  observedTension: number;
  temperature: number;
  calculatedConcentration: number;
  deviation: number;
  explanation: CalculationExplanation;
  status: CalculationStatus;
  error?: OperationalError;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdBy: string;
  createdAt: string;
  traceIds: TraceLink[];
}

export type AuditAction =
  | 'create'
  | 'update'
  | 'review'
  | 'supplement'
  | 'merge'
  | 'export';

export type AuditEntityType = 'calculation' | 'reagent' | 'batch';

export interface AuditLog {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  operator: string;
  timestamp: string;
  details: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export type BatchStatus = 'normal' | 'attention' | 'anomaly';

export interface BatchInfo {
  batchNo: string;
  reagentCount: number;
  calculationCount: number;
  latestActivityAt: string;
  status: BatchStatus;
  timeline: TraceLink[];
}
