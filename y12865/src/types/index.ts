export type RiskLevel = 'safe' | 'warning' | 'danger';
export type DataStatus = 'pending' | 'approved' | 'delayed' | 'recollect';
export type TrajectoryMode = 'raw' | 'cleaned' | 'both';
export type SourceType = 'excel' | 'image' | 'note';

export interface WaterQuality {
  temperature: number;
  salinity: number;
  ph: number;
  dissolvedOxygen: number;
  turbidity: number;
}

export interface DataSource {
  id: string;
  type: SourceType;
  fileName: string;
  rowNumber?: number;
  remark?: string;
}

export interface ReviewLog {
  id: string;
  timestamp: string;
  operator: string;
  beforeStatus: DataStatus;
  afterStatus: DataStatus;
  remark: string;
  diff?: Partial<WaterQuality>;
}

export interface SamplePoint {
  id: string;
  missionId: string;
  name: string;
  position: { x: number; y: number; depth: number };
  riskLevel: RiskLevel;
  status: DataStatus;
  waterQuality: WaterQuality;
  sources: DataSource[];
  reviewLogs: ReviewLog[];
  available: boolean;
  delayed: boolean;
  recollect: boolean;
}

export interface Mission {
  id: string;
  name: string;
  date: string;
  version: string;
  status: 'active' | 'archived';
  operator: string;
  samplePoints: SamplePoint[];
  trajectories: {
    raw: { x: number; y: number; depth: number }[];
    cleaned: { x: number; y: number; depth: number }[];
  };
}

export interface RiskSummary {
  safe: number;
  warning: number;
  danger: number;
  approved: number;
  delayed: number;
  recollect: number;
  pending: number;
}
