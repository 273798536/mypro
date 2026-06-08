export type RiskLevel = 'safe' | 'warning' | 'danger';

export type EventType = 'collision' | 'out-of-bounds' | 'warning' | 'data-missing';

export type DemoStatus = 'idle' | 'playing' | 'paused' | 'finished';

export type PlaySpeed = 0.5 | 1 | 2;

export interface SlopePoint {
  id: string;
  x: number;
  y: number;
  z: number;
  height: number;
  riskLevel: RiskLevel;
  sensorId?: string;
}

export interface CuttingPlane {
  position: number;
  normal: [number, number, number];
  thickness: number;
  isOutOfBounds: boolean;
  minDistance: number;
  closestPointId: string | null;
}

export interface DetectionEvent {
  id: string;
  timestamp: number;
  frameIndex: number;
  type: EventType;
  planePosition: number;
  minDistance: number;
  threshold: number;
  involvedPoints: string[];
  description: string;
  isRecordUsable: boolean;
  unusableReason?: string;
  riskLevel: RiskLevel;
}

export interface DemoSession {
  id: string;
  startTime: Date;
  status: DemoStatus;
  currentTime: number;
  totalDuration: number;
  playSpeed: PlaySpeed;
  plane: CuttingPlane;
  events: DetectionEvent[];
  outOfBoundsCount: number;
  maxRiskLevel: RiskLevel;
  unusableRecords: DetectionEvent[];
  distanceHistory: { time: number; distance: number }[];
}

export interface ThresholdConfig {
  safeDistance: number;
  warningDistance: number;
  dangerDistance: number;
  consecutiveFrames: number;
}
