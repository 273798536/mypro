export interface Point {
  x: number;
  y: number;
}

export interface Acupoint {
  id: string;
  name: string;
  alias?: string;
  position: Point;
  bodyPart: 'head' | 'torso' | 'arm' | 'leg';
  meridian: string;
  description: string;
  indications: string[];
}

export interface TrajectoryPoint extends Point {
  timestamp: number;
  pressure?: number;
}

export interface Trajectory {
  id: string;
  points: TrajectoryPoint[];
  acupointId: string;
  acupointName: string;
  operator: string;
  startTime: number;
  endTime: number;
  accuracy: number;
  durationMs: number;
}

export type AnomalyType = 'collision' | 'position_error' | 'missing_data' | 'unit_error';
export type Severity = 'low' | 'medium' | 'high';

export interface Anomaly {
  id: string;
  type: AnomalyType;
  description: string;
  location: Point;
  severity: Severity;
  materialSource: string;
  changedResult: boolean;
  trajectoryId?: string;
  notes?: string;
  resolved?: boolean;
}

export type DeviceStatus = 'online' | 'offline' | 'maintenance';

export interface Device {
  id: string;
  name: string;
  type: string;
  model: string;
  serialNumber: string;
  status: DeviceStatus;
  dataSource: string;
  calibrationDate: string;
  lastUsed: string;
  battery?: number;
}

export interface Layer {
  id: string;
  name: string;
  version: number;
  description: string;
  visible: boolean;
  opacity: number;
  timestamp: number;
  author: string;
  parentId?: string;
}

export type BatchStatus = 'draft' | 'in_progress' | 'review' | 'completed';

export interface Batch {
  id: string;
  name: string;
  status: BatchStatus;
  trainee: string;
  trainer: string;
  devices: Device[];
  trajectories: Trajectory[];
  anomalies: Anomaly[];
  layers: Layer[];
  createdAt: number;
  updatedAt: number;
  reviewNotes?: string;
}

export type ExampleType = 'old_form' | 'supplementary' | 'missing_unit' | 'collision_example';

export interface ExampleItem {
  id: string;
  title: string;
  type: ExampleType;
  summary: string;
  content: {
    label: string;
    value: string | number;
    original?: string | number;
    corrected?: string | number;
    hasIssue?: boolean;
    issueDescription?: string;
  }[];
  draftAnnotations?: string;
  explanation: string;
  materialSource: string;
  changedResult: boolean;
  beforeConclusion: string;
  afterConclusion: string;
}

export interface ReviewNote {
  id: string;
  author: string;
  content: string;
  timestamp: number;
  targetType: 'trajectory' | 'anomaly' | 'layer' | 'batch';
  targetId: string;
}
