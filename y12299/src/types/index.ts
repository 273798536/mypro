export interface WindParams {
  speed: number;
  yawAngle: number;
  pitchAngle: number;
  density: number;
}

export interface StreamPoint {
  x: number;
  y: number;
  z: number;
  velocity: number;
  direction: [number, number, number];
}

export interface StreamLine {
  id: string;
  points: StreamPoint[];
  color: string;
  startPosition: [number, number, number];
}

export type RiskType = 'angle_violation' | 'oversampling' | 'reverse_flow';

export type Severity = 'low' | 'medium' | 'high';

export interface RiskPoint {
  id: string;
  type: RiskType;
  position: [number, number, number];
  severity: Severity;
  value: number;
  description: string;
}

export interface ExportRecord {
  id: string;
  timestamp: number;
  modelName: string;
  windParams: WindParams;
  screenshotUrl: string;
  riskSummary: {
    angleViolations: number;
    oversampling: number;
    reverseFlows: number;
  };
  hasDataGap: boolean;
  dataGapNote?: string;
}

export interface AppState {
  currentWindParams: WindParams;
  compareWindParams: WindParams | null;
  streamLines: StreamLine[];
  riskPoints: RiskPoint[];
  dataGaps: string[];
  exportRecords: ExportRecord[];
  showRiskLabels: boolean;
  showLegend: boolean;
  viewMode: 'single' | 'compare';
  modelName: string;
}
