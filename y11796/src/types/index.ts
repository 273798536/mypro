export type ResistanceUnit = 'Ω' | 'kΩ' | 'MΩ';
export type CapacitanceUnit = 'F' | 'μF' | 'nF' | 'pF';
export type VoltageUnit = 'V' | 'mV' | 'kV';
export type TimeUnit = 's' | 'ms' | 'μs';
export type DataSource = 'theoretical' | 'student' | 'corrected';
export type WarningType = 'unit_mismatch' | 'time_constant_error' | 'nonzero_initial' | 'out_of_range' | 'data_anomaly';
export type WarningSeverity = 'info' | 'warning' | 'error';
export type StudentStatus = 'raw' | 'processed' | 'corrected' | 'needs_review';
export type ResultStatus = 'normal' | 'warning' | 'error' | 'needs_review';
export type ParamSource = 'manual' | 'preset' | 'import';
export type CircuitMode = 'charge' | 'discharge' | 'both';

export interface DataPoint {
  time: number;
  voltage: number;
  current?: number;
  source: DataSource;
  warnings?: Warning[];
}

export interface CircuitParams {
  id: string;
  name: string;
  resistance: number;
  resistanceUnit: ResistanceUnit;
  capacitance: number;
  capacitanceUnit: CapacitanceUnit;
  sourceVoltage: number;
  voltageUnit: VoltageUnit;
  initialVoltage: number;
  samplePoints: number;
  timeRange: number;
  timeUnit: TimeUnit;
  createdAt: string;
  updatedAt: string;
  source: ParamSource;
  mode: CircuitMode;
}

export interface Warning {
  id: string;
  type: WarningType;
  severity: WarningSeverity;
  message: string;
  field?: string;
  value?: any;
  suggestion?: string;
}

export interface CalculationResult {
  paramsId: string;
  timeConstant: number;
  timeConstantUnit: TimeUnit;
  timeConstantDisplay: string;
  chargeCurve: DataPoint[];
  dischargeCurve: DataPoint[];
  warnings: Warning[];
  status: ResultStatus;
  calculatedAt: string;
}

export interface CorrectionRecord {
  id: string;
  timestamp: string;
  field: string;
  oldValue: any;
  newValue: any;
  reason: string;
  operator: string;
  dataSource: string;
  version: number;
}

export interface ErrorStats {
  mse: number;
  rmse: number;
  mae: number;
  maxError: number;
  maxErrorPoint: DataPoint | null;
  correlation: number;
}

export interface StudentData {
  id: string;
  studentId: string;
  studentName: string;
  experimentId: string;
  dataPoints: DataPoint[];
  paramsSnapshot: CircuitParams;
  errorAnalysis?: ErrorStats;
  corrections: CorrectionRecord[];
  status: StudentStatus;
  importedAt: string;
  source: string;
  warnings: Warning[];
}

export interface ReportData {
  id: string;
  generatedAt: string;
  experimentName: string;
  totalStudents: number;
  rawData: StudentData[];
  correctedData: StudentData[];
  needsReview: StudentData[];
  errorSummary: {
    averageMSE: number;
    averageRMSE: number;
    errorDistribution: Record<string, number>;
    warningCounts: Record<string, number>;
  };
  title?: string;
  studentCount?: number;
  summary?: {
    totalStudents: number;
    untreatedCount: number;
    correctedCount: number;
    needsReviewCount: number;
    avgMse: number;
    avgRmse: number;
    avgMae: number;
    avgCorrelation: number;
    timeConstant: number;
    warningCount: number;
  };
  params?: {
    resistance: number;
    resistanceUnit: string;
    capacitance: number;
    capacitanceUnit: string;
    sourceVoltage: number;
    voltageUnit: string;
    initialVoltage: number;
    timeConstant: number;
    samplePoints: number;
  };
  classification?: {
    untreated: StudentData[];
    corrected: StudentData[];
    needsReview: StudentData[];
  };
}

export interface PresetParams {
  id: string;
  name: string;
  description: string;
  params: Omit<CircuitParams, 'id' | 'createdAt' | 'updatedAt' | 'source'>;
  createdAt: string;
}

export interface UnitHistory {
  field: string;
  oldUnit: string;
  newUnit: string;
  timestamp: string;
}
