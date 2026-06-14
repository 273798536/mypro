export enum ProcessingStatus {
  NORMAL = 'normal',
  NOISE = 'noise',
  EXTREME = 'extreme',
  SUSPICIOUS = 'suspicious',
  MANUAL_OVERRIDE = 'manual_override',
  PENDING = 'pending',
}

export enum JumpCause {
  THRESHOLD = 'threshold',
  UNIT_MISMATCH = 'unit_mismatch',
  MATERIAL_NAME_MISMATCH = 'material_name_mismatch',
  UNKNOWN = 'unknown',
}

export interface RawSensorLog {
  [key: string]: unknown;
}

export interface TensionRecord {
  id: string;
  timestamp: number;
  materialId: string;
  materialName: string;
  tension: number;
  tensionUnit: string;
  pulleyGroupId: string;
  speed: number;
  temperature: number;
  sourceFile: string;
  sourceFields: string[];
  processingStatus: ProcessingStatus;
  statusReason: string;
  isJumpPoint: boolean;
  jumpCause?: JumpCause;
  jumpDetail?: string;
  rawData: RawSensorLog;
}

export interface FilterCondition {
  materialId?: string;
  materialName?: string;
  pulleyGroupId?: string;
  statuses: ProcessingStatus[];
  timeRange?: { start: number; end: number };
  tensionRange?: { min: number; max: number };
  showJumpOnly: boolean;
}

export interface StatsSummary {
  totalCount: number;
  normalCount: number;
  noiseCount: number;
  extremeCount: number;
  suspiciousCount: number;
  manualOverrideCount: number;
  jumpCount: number;
  avgTension: number;
  maxTension: number;
  minTension: number;
  tensionStdDev: number;
}

export interface AnalysisResult {
  records: TensionRecord[];
  stats: StatsSummary;
  jumpPoints: TensionRecord[];
  abnormalRecords: TensionRecord[];
  materialGroups: { materialId: string; materialName: string; count: number }[];
  pulleyGroups: { pulleyGroupId: string; count: number }[];
  filterApplied: FilterCondition;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  operator: string;
  recordId: string;
  oldStatus: ProcessingStatus;
  newStatus: ProcessingStatus;
  oldReason: string;
  newReason: string;
  note?: string;
}

export interface FieldMapping {
  [standardField: string]: string[];
}
