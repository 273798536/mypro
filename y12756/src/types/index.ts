export type JudgeResult = "络合" | "未络合" | "待确认";
export type BatchStatus = "normal" | "anomaly" | "pending";
export type ActionType = "run" | "rerun" | "supplement" | "confirm";
export type AnomalyType = "missing_unit" | "missing_time" | "outlier" | "manual_flag" | "duplicate_batch" | "unit_mismatch";

export interface SpectrumPoint {
  wavelength: number;
  absorbance: number;
  isAnomaly?: boolean;
}

export interface SafetyNote {
  chemical: string;
  formula: string;
  hazard: "低" | "中" | "高";
  precaution: string;
  ghsCode?: string;
}

export interface SampleRecord {
  id: string;
  sampleNo: string;
  metalIon: string;
  ligand: string;
  concentration: number | null;
  concentrationUnit: string | null;
  originalConcentrationUnit?: string | null;
  reactionTime: number | null;
  reactionTimeUnit: string | null;
  peakWavelength: number;
  peakAbsorbance: number;
  isMissingReactionTime?: boolean;
  isMissingUnit?: boolean;
  judgeResult: JudgeResult;
  sourceDoc: string;
  isAnomaly: boolean;
  anomalyReason?: string;
  anomalyType?: AnomalyType;
  manuallyOverridden?: boolean;
  originalJudgeResult?: JudgeResult;
  supplementNote?: string;
  correctedConcentration?: number | null;
}

export interface BatchInfo {
  id: string;
  name: string;
  status: BatchStatus;
  materialSource: string;
  createdAt: string;
  operator: string;
  description: string;
  isDuplicateBatch?: boolean;
  duplicateWith?: string;
  notes?: string[];
}

export interface BatchData {
  info: BatchInfo;
  samples: SampleRecord[];
  spectrum: SpectrumPoint[];
  safetyNotes: SafetyNote[];
}

export interface AuditLog {
  id: string;
  actionType: ActionType;
  timestamp: string;
  operator: string;
  detail: string;
  beforeState?: string;
  afterState?: string;
  targetSampleId?: string;
}

export interface AnomalyRecord {
  id: string;
  sampleId: string;
  sampleNo: string;
  type: AnomalyType;
  description: string;
  field: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface ConcentrationCalcResult {
  absorbance: number;
  epsilon: number;
  pathLength: number;
  concentration: number;
  unit: string;
  formula: string;
}

export type MainTab = "spectrum" | "anomaly" | "audit";
