export type RiskLevel = 'normal' | 'warning' | 'error' | 'pending_material';
export type AnomalyType = 'time_mismatch' | 'risk_mismatch' | 'occlusion_misread' | 'section_missing' | null;
export type NextAction = 'fill_material' | 'adjust_criteria' | null;

export interface RopePoint {
  x: number;
  y: number;
  z: number;
}

export interface AngleDataPoint {
  timestamp: number;
  angle: number;
  explanation: string;
}

export interface SectionFrame {
  frameIndex: number;
  timestamp: number;
  imageUrl?: string;
  data: number[];
  note: string;
}

export interface SimulationRecord {
  id: string;
  code: string;
  createdAt: string;
  updatedAt: string;
  startTime: string;
  endTime: string;
  ropePoints: RopePoint[];
  angleData: AngleDataPoint[];
  sections: SectionFrame[];
  riskLevel: RiskLevel;
  riskNote: string;
  anomalyType: AnomalyType;
  nextAction: NextAction;
  occlusionRejected: boolean;
  occlusionReason: string;
}

export interface HistoryVersion {
  id: string;
  recordId: string;
  version: number;
  modifiedAt: string;
  modifiedBy: string;
  changes: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
  snapshot: SimulationRecord;
}

export interface ExportReportData {
  record: SimulationRecord;
  history: HistoryVersion[];
  occlusionExplanation: {
    title: string;
    criteria: string[];
    rejectionReason: string;
  };
}

export interface StatsSummary {
  normal: number;
  warning: number;
  error: number;
  pending_material: number;
}

export interface UpdateRecordPayload {
  startTime?: string;
  endTime?: string;
  riskNote?: string;
  riskLevel?: RiskLevel;
  anomalyType?: AnomalyType;
  nextAction?: NextAction;
}
