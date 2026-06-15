import { RiskLevel, SalinityUnit, DataStatus, QualityIssue } from './common';

export interface WaterRecord {
  [key: string]: unknown;
  id: string;
  taskId: string;
  pointId: string;
  recordTime: Date;
  salinity: number | null;
  salinityUnit: SalinityUnit;
  ph: number | null;
  dissolvedOxygen: number | null;
  temperature: number | null;
  status: string;
  unitMismatch?: boolean;
  salinityStatus?: DataStatus;
  phStatus?: DataStatus;
  dissolvedOxygenStatus?: DataStatus;
  temperatureStatus?: DataStatus;
  overallStatus?: DataStatus;
  qualityIssues?: QualityIssue[];
}

export interface RiskFactor {
  id: string;
  name: string;
  weight: number;
  value: number;
  riskLevel: RiskLevel;
  riskScore: number;
  description: string;
  dataSource: string;
  suggestion: string;
  explanation: string;
}

export interface RiskMatrixCell {
  tideLevel: string;
  salinityLevel: string;
  riskLevel: number;
  riskScore: number;
  explanation: string;
  affectedZone: string;
  count: number;
  likelihood: number;
  severity: number;
  affectedPoints: string[];
}

export interface RiskAlert {
  id: string;
  taskId: string;
  type: string;
  level: RiskLevel;
  description: string;
  explanation: string;
  suggestion: string;
  pointId?: string;
  factors: string[];
  triggeredAt: Date;
}

export interface RiskAssessmentResult {
  taskId: string;
  overallRiskLevel: RiskLevel;
  overallRiskScore: number;
  explanation: string;
  factors: RiskFactor[];
  matrix: RiskMatrixCell[][];
  alerts: RiskAlert[];
}
