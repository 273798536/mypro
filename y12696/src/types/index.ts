export type DeviceType = 'sensor' | 'valve' | 'pump' | 'gauge';
export type DeviceStatus = 'normal' | 'warning' | 'error';
export type Severity = 'info' | 'warning' | 'danger';
export type ImpactLevel = 'none' | 'low' | 'medium' | 'high';
export type ReviewStep = 'repeat' | 'supplement' | 'confirm';
export type Axis = 'x' | 'y' | 'z';
export type BoundaryCategory = 'camera_loss' | 'outlier_float' | 'data_gap';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface DeviceCoord {
  id: string;
  name: string;
  type: DeviceType;
  position: [number, number, number];
  status: DeviceStatus;
  value?: number;
  unit?: string;
}

export interface WaterLevelState {
  currentLevel: number;
  targetLevel: number;
  maxLevel: number;
  minLevel: number;
  upstreamLevel: number;
  downstreamLevel: number;
  flowRate: number;
}

export interface CameraView {
  id: string;
  name: string;
  description: string;
  position: [number, number, number];
  target: [number, number, number];
  impactLevel: ImpactLevel;
  impactNote: string;
  createdAt: number;
}

export interface AnomalyConclusion {
  id: string;
  title: string;
  description: string;
  explanation: string;
  severity: Severity;
  affectedDevices: string[];
  location?: [number, number, number];
  verified: boolean;
}

export interface ReviewRecord {
  step: ReviewStep;
  completed: boolean;
  timestamp?: number;
  operator?: string;
  note?: string;
  supplementData?: Record<string, unknown>;
}

export interface RiskRemark {
  id: string;
  content: string;
  modifiedAt: number;
  modifier: string;
  previousVersion?: RiskRemark;
  impactedConclusions: string[];
}

export interface SectionPlaneState {
  axis: Axis;
  position: number;
  enabled: boolean;
  invert: boolean;
}

export interface BoundaryCase {
  id: string;
  name: string;
  description: string;
  category: BoundaryCategory;
  beforeState: {
    waterLevel: WaterLevelState;
    anomalies: AnomalyConclusion[];
  };
  afterState: {
    waterLevel: WaterLevelState;
    anomalies: AnomalyConclusion[];
  };
  impactExplanation: string;
}

export interface ExplanationItem {
  id: string;
  icon: string;
  title: string;
  content: string;
  highlight?: string;
}

export type PanelTab = 'section' | 'view' | 'review' | 'risk' | 'boundary';
