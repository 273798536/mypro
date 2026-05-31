export interface ElevatorProfile {
  id: string;
  elevatorNo: string;
  model: string;
  ratedSpeed: number;
  ratedLoad: number;
  manufacturer: string;
  installDate: string;
  location: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpeedPoint {
  time: number;
  speed: number;
}

export type DataStatus = 'normal' | 'bad';

export interface InspectionRecord {
  id: string;
  elevatorId: string;
  elevatorNo: string;
  ratedSpeed: number;
  ratedLoad: number;
  speedCurve: SpeedPoint[];
  inspectionDate: string;
  inspector: string;
  actualLoad: number;
  actualSpeed: number;
  brakeTime: number;
  speedCurveData: SpeedPoint[];
  inspectionRemark: string;
  sourceFile: string;
  rowNumber: number;
  dataStatus: DataStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CalculationParams {
  ratedSpeed: number;
  actualLoad: number;
  ratedLoad: number;
  brakeTime: number;
  frictionCoefficient: number;
  gravityAcceleration: number;
}

export interface BrakeCalculation {
  id: string;
  recordId: string;
  theoreticalDistance: number;
  theoreticalBrakeDistance: number;
  actualDistance: number;
  actualBrakeDistance: number;
  distanceDeviation: number;
  deviationRate: number;
  deviationPercent: number;
  frictionCoefficient: number;
  calculationFormula: string;
  calculationParams: CalculationParams;
  dataHash: string;
  calculatedAt: string;
}

export type AbnormalLevel = 'normal' | 'warning' | 'serious' | 'overload';

export type AbnormalType = 'speed_gap' | 'brake_delay' | 'overload' | 'brake_distance' | 'missing_data';

export interface AbnormalDetection {
  id: string;
  recordId: string;
  hasSpeedGap: boolean;
  speedGapValue: number;
  hasBrakeDelay: boolean;
  brakeDelayValue: number;
  hasOverload: boolean;
  overloadValue: number;
  abnormalTypes: AbnormalType[];
  detectedTypes: AbnormalType[];
  abnormalLevel: AbnormalLevel;
  overallLevel: AbnormalLevel;
  abnormalDescription: string;
  description: string;
  overallResult: 'pass' | 'fail';
  reviewed: boolean;
  detectedAt: string;
}

export interface ThresholdCheck {
  id: string;
  recordId: string;
  brakeDistanceMin: number;
  brakeDistanceMax: number;
  speedGapThreshold: number;
  brakeDelayThreshold: number;
  loadThreshold: number;
  isBrakeDistanceOk: boolean;
  isSpeedGapOk: boolean;
  isBrakeDelayOk: boolean;
  isLoadOk: boolean;
  brakeDistanceLevel: AbnormalLevel;
  speedGapLevel: AbnormalLevel;
  brakeDelayLevel: AbnormalLevel;
  loadLevel: AbnormalLevel;
  overallResult: 'pass' | 'fail';
  checkedAt: string;
}

export type TraceStep = 'profile' | 'raw' | 'cleaning' | 'calculation' | 'threshold' | 'abnormal';

export interface DataTrace {
  id: string;
  recordId: string;
  traceStep: TraceStep;
  beforeData: Record<string, any>;
  afterData: Record<string, any>;
  operation: string;
  operator: string;
  operatedAt: string;
}

export type BadRowErrorType = 'empty' | 'missing_col' | 'invalid_value' | 'remark';

export interface BadRow {
  id: string;
  recordId: string;
  sourceFile: string;
  rowNumber: number;
  rowContent: string;
  rawData: Record<string, any>;
  errorType?: BadRowErrorType;
  errorTypes: BadRowErrorType[];
  errorDescription: string;
  isManualReviewed: boolean;
  reviewed: boolean;
  reviewRemark: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface ThresholdConfig {
  brakeDistance: {
    warningMinRate: number;
    warningMaxRate: number;
    seriousMinRate: number;
    seriousMaxRate: number;
  };
  speedGap: {
    warningThreshold: number;
    seriousThreshold: number;
  };
  brakeDelay: {
    warningThreshold: number;
    seriousThreshold: number;
  };
  load: {
    warningRate: number;
    overloadRate: number;
  };
  friction: {
    baseCoefficient: number;
    loadInfluenceCoefficient: number;
  };
  brakeDistanceWarning: number;
  brakeDistanceSerious: number;
  speedGapWarning: number;
  speedGapSerious: number;
  brakeDelayWarning: number;
  brakeDelaySerious: number;
  overloadThreshold: number;
  baseFrictionCoefficient: number;
  loadInfluenceFactor: number;
}

export interface ReportSummary {
  totalRecords: number;
  normalCount: number;
  warningCount: number;
  seriousCount: number;
  overloadCount: number;
  badRowCount: number;
  passRate: number;
}

export interface ExportRecord {
  elevatorNo: string;
  inspectionDate: string;
  ratedSpeed: number;
  ratedLoad: number;
  actualLoad: number;
  actualSpeed: number;
  brakeTime: number;
  theoreticalDistance: number;
  actualDistance: number;
  deviationRate: number;
  abnormalLevel: string;
  abnormalDescription: string;
  overallResult: string;
}

export interface ExportReport {
  reportId: string;
  generatedAt: string;
  generatedBy: string;
  summary: ReportSummary;
  records: ExportRecord[];
  badRows: BadRow[];
  charts: string[];
  dataHash: string;
}

export interface ImportRawRow {
  [key: string]: any;
  _rowNumber: number;
  _sourceFile: string;
}

export interface ColumnMapping {
  elevatorNo: string;
  inspectionDate: string;
  inspector: string;
  actualLoad: string;
  actualSpeed: string;
  brakeTime: string;
  speedCurveData?: string;
  speedCurve?: string;
  inspectionRemark?: string;
  remark?: string;
  ratedSpeed?: string;
  ratedLoad?: string;
  model?: string;
  manufacturer?: string;
  location?: string;
}

export interface CleaningResult {
  normalRecords: InspectionRecord[];
  badRows: BadRow[];
  traces: DataTrace[];
  elevatorProfiles: ElevatorProfile[];
}

export interface RecordWithDetails extends InspectionRecord {
  elevator: ElevatorProfile;
  profile: ElevatorProfile;
  record: InspectionRecord;
  calculation: BrakeCalculation | null;
  abnormal: AbnormalDetection | null;
  detection: AbnormalDetection | null;
  threshold: ThresholdCheck | null;
  traces: DataTrace[];
}

export interface FilterOptions {
  abnormalLevel?: AbnormalLevel[];
  abnormalTypes?: AbnormalType[];
  elevatorNo?: string;
  dateFrom?: string;
  dateTo?: string;
  inspector?: string;
  overallResult?: 'pass' | 'fail';
}
