export interface GapSensorData {
  timestamp: number;
  sensorId: string;
  carNumber: string;
  gapValue: number;
  sectionId: string;
}

export interface SpeedRecord {
  timestamp: number;
  carNumber: string;
  speed: number;
  sectionId: string;
}

export interface CarMapping {
  sensorId: string;
  carNumber: string;
  lineId: string;
}

export interface ThresholdVersion {
  id: string;
  version: string;
  name: string;
  effectiveDate: string;
  applicableLines: string[];
  normalGap: { min: number; max: number };
  warningGap: { min: number; max: number };
  speedSuddenChange: number;
  sensorDriftThreshold: number;
  missingSectionThreshold: number;
  dynamicThresholdAdjustment: number;
}

export type ResultStatus = 'PASS' | 'WARNING' | 'FAIL' | 'MISSING';

export type AnomalyType = 'DRIFT' | 'SPEED_SUDDEN_CHANGE' | 'MISSING' | 'GAP_ABNORMAL';

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Anomaly {
  type: AnomalyType;
  description: string;
  severity: AnomalySeverity;
  timestamp: number;
}

export interface JudgmentResult {
  id: string;
  sectionId: string;
  carNumber: string;
  status: ResultStatus;
  gapValue: number;
  unit: string;
  thresholdVersion: string;
  applicableScope: string;
  failureReason?: string;
  anomalies: Anomaly[];
  createdAt: number;
  hasSpeedData: boolean;
}

export type WorkOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';

export interface WorkOrder {
  id: string;
  sectionId: string;
  carNumber: string;
  anomalyType: string;
  description: string;
  status: WorkOrderStatus;
  assignedTeam: string;
  createdAt: number;
  judgmentResultId: string;
}

export interface CorrectionRecord {
  id: string;
  originalCarMapping: CarMapping[];
  correctedCarMapping: CarMapping[];
  originalResults: JudgmentResult[];
  correctedResults: JudgmentResult[];
  createdAt: number;
  operator: string;
}

export type ImportPhase = 'PHASE1' | 'PHASE2';

export interface ImportState {
  phase: ImportPhase;
  hasGapData: boolean;
  hasSpeedData: boolean;
  hasCarMapping: boolean;
}

export interface SectionAttribution {
  sectionId: string;
  lineId: string;
  responsibleTeam: string;
  maintenanceWindow: string;
}
