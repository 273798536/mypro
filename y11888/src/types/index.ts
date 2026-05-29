export interface ExperimentDataRow {
  id: string;
  date: string;
  historicalConversion: number | null;
  dailyTraffic: number | null;
  minimumLift: number | null;
  remarks: string;
  isDirty: boolean;
  dirtyReason: string;
}

export interface ExperimentConfig {
  controlConversion: number;
  minimumLift: number;
  significanceLevel: number;
  power: number;
  trafficRatio: number;
  dailyTraffic: number;
  trafficAllocation: number;
}

export interface SampleSizeResult {
  requiredSampleSize: number;
  totalSampleSize: number;
  estimatedDays: number;
  confidenceInterval: [number, number];
  zScore: number;
  standardError: number;
  detectableEffect: number;
}

export interface PowerDataPoint {
  lift: number;
  requiredSampleSize: number;
  power: number;
}

export interface TrafficCheckStep {
  id: string;
  name: string;
  description: string;
  status: 'pass' | 'fail' | 'pending' | 'review';
  required: number;
  available: number;
  gap: number;
  details: string;
}

export interface GroupValidationItem {
  id: string;
  name: string;
  description: string;
  method: string;
  statistic: number;
  pValue: number;
  threshold: number;
  status: 'pass' | 'fail' | 'review';
  recommendation: string;
}

export type AuditAction = 'data_import' | 'data_clean' | 'param_change' | 'calculation' | 'validation' | 'export';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: AuditAction;
  description: string;
  before: any;
  after: any;
  userNote: string;
}

export interface AnalysisReport {
  id: string;
  generatedAt: number;
  config: ExperimentConfig;
  sampleSizeResult: SampleSizeResult;
  trafficChecks: TrafficCheckStep[];
  groupValidations: GroupValidationItem[];
  auditLogs: AuditLogEntry[];
  summary: string;
  risks: string[];
  recommendations: string[];
}

export interface AppState {
  rawData: ExperimentDataRow[];
  cleanedData: ExperimentDataRow[];
  config: ExperimentConfig;
  sampleSizeResult: SampleSizeResult | null;
  powerCurveData: PowerDataPoint[];
  trafficChecks: TrafficCheckStep[];
  groupValidations: GroupValidationItem[];
  auditLogs: AuditLogEntry[];
  currentReport: AnalysisReport | null;
  currentStep: number;
}

export interface AppActions {
  setRawData: (data: ExperimentDataRow[]) => void;
  setCleanedData: (data: ExperimentDataRow[]) => void;
  setConfig: (config: Partial<ExperimentConfig>) => void;
  setSampleSizeResult: (result: SampleSizeResult | null) => void;
  setPowerCurveData: (data: PowerDataPoint[]) => void;
  setTrafficChecks: (checks: TrafficCheckStep[]) => void;
  setGroupValidations: (validations: GroupValidationItem[]) => void;
  addAuditLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
  setCurrentReport: (report: AnalysisReport | null) => void;
  setCurrentStep: (step: number) => void;
  reset: () => void;
  loadSampleData: () => void;
}

export type AppStore = AppState & AppActions;
