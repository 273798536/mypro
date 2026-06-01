export type MaterialType = 'copper' | 'aluminum' | 'steel' | 'other';
export type TestBenchStatus = 'online' | 'offline' | 'maintenance';
export type TemperatureObjectType = 'winding' | 'bearing' | 'housing';
export type AnomalyType = 'speed_missing' | 'temp_overlimit' | 'power_reverse';
export type AnomalySeverity = 'warning' | 'error' | 'critical';
export type DataCaliberType = 'voltage_current' | 'temperature' | 'efficiency' | 'all';
export type CaliberCategory = 'voltage' | 'current' | 'power' | 'temperature' | 'efficiency';
export type CorrectionStatus = 'pending' | 'approved' | 'rejected';

export interface Material {
  id: string;
  code: string;
  name: string;
  type: MaterialType;
  temperatureLimit: number;
  powerRange: [number, number];
  speedSampleInterval: number;
}

export interface TestBench {
  id: string;
  name: string;
  code: string;
  status: TestBenchStatus;
  lastUpdate: Date;
}

export interface WorkingConditionSegment {
  id: string;
  name: string;
  order: number;
  speedRange: [number, number];
  torqueRange: [number, number];
  color: string;
}

export interface SegmentScheme {
  id: string;
  name: string;
  segments: WorkingConditionSegment[];
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
}

export interface VoltageCurrentData {
  id: string;
  testBenchId: string;
  materialId: string;
  timestamp: Date;
  voltage: number;
  current: number;
  power: number;
  segmentId: string;
}

export interface TemperatureData {
  id: string;
  testBenchId: string;
  materialId: string;
  timestamp: Date;
  objectType: TemperatureObjectType;
  temperature: number;
  segmentId: string;
}

export interface SpeedTorqueData {
  id: string;
  testBenchId: string;
  materialId: string;
  timestamp: Date;
  speed: number;
  torque: number;
  isMissing: boolean;
  segmentId: string;
}

export interface EfficiencyReport {
  id: string;
  testBenchId: string;
  materialId: string;
  segmentId: string;
  startTime: Date;
  endTime: Date;
  inputPower: number;
  outputPower: number;
  efficiency: number;
  isCorrected: boolean;
  originalData?: {
    speed: number;
    torque: number;
    efficiency: number;
  };
  correctedData?: {
    speed: number;
    torque: number;
    efficiency: number;
    operator: string;
    reason: string;
    correctedAt: Date;
  };
}

export interface AnomalyRecord {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  testBenchId: string;
  materialId: string;
  objectType?: string;
  segmentId: string;
  timestamp: Date;
  actualValue: number;
  threshold: number;
  duration?: number;
  message: string;
  resolved: boolean;
  resolution?: string;
}

export interface FilterCriteria {
  testBenchIds: string[];
  materialIds: string[];
  segmentIds: string[];
  timeRange: [Date, Date] | null;
  anomalyTypes: AnomalyType[];
  dataCaliber: DataCaliberType;
}

export interface CaliberConfig {
  id: string;
  name: string;
  type: CaliberCategory;
  formula: string;
  unit: string;
  precision: number;
  isSystemDefault: boolean;
  description: string;
}

export interface CorrectionLog {
  id: string;
  reportId: string;
  operatorId: string;
  operatorName: string;
  originalSpeed: number;
  originalTorque: number;
  originalEfficiency: number;
  correctedSpeed: number;
  correctedTorque: number;
  correctedEfficiency: number;
  reason: string;
  status: CorrectionStatus;
  createdAt: Date;
  approvedAt?: Date;
  approver?: string;
}

export interface ThresholdConfig {
  materialId: string;
  temperatureLimit: number;
  powerMin: number;
  powerMax: number;
  speedSampleInterval: number;
}

export interface ConflictInfo {
  type: string;
  field: string;
  source1: { name: string; value: number };
  source2: { name: string; value: number };
  description: string;
}

export interface ComparisonData {
  original: EfficiencyReport;
  corrected: EfficiencyReport;
  diff: {
    speed: number;
    torque: number;
    efficiency: number;
    power: number;
  };
}

export interface ChartDataPoint {
  timestamp: number;
  value: number;
  segmentId?: string;
  anomalyId?: string;
}

export interface DashboardStats {
  totalTestBenches: number;
  onlineTestBenches: number;
  offlineTestBenches: number;
  maintenanceTestBenches: number;
  todayAnomalies: {
    speedMissing: number;
    tempOverlimit: number;
    powerReverse: number;
  };
  recentCorrections: CorrectionLog[];
  anomalyTrend: { date: string; count: number }[];
}

export interface UploadValidationResult {
  valid: boolean;
  errors: {
    row: number;
    field: string;
    message: string;
  }[];
  warnings: {
    row: number;
    field: string;
    message: string;
  }[];
  totalRows: number;
  validRows: number;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  required: boolean;
  detected: boolean;
}

export type AllDataType = {
  voltageData: VoltageCurrentData[];
  temperatureData: TemperatureData[];
  speedData: SpeedTorqueData[];
  efficiencyReports: EfficiencyReport[];
  anomalies: AnomalyRecord[];
};
