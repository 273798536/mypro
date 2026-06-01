
export interface FloorData {
  id: string;
  name: string;
  level: number;
  width: number;
  height: number;
  color: string;
  walls: WallData[];
}

export interface WallData {
  start: { x: number; y: number };
  end: { x: number; y: number };
  height: number;
}

export interface BeaconData {
  id: string;
  mac: string;
  name: string;
  floorId: string;
  x: number;
  y: number;
  z: number;
  signalStrength: number;
}

export interface TrajectoryPoint {
  id: string;
  timestamp: number;
  floorId: string;
  x: number;
  y: number;
  z: number;
  signalStrength: number;
  connectedBeacon: string;
}

export interface DeviceLog {
  id: string;
  timestamp: number;
  beaconId: string;
  eventType: string;
  message: string;
}

export type ProblemType = 'floor_jump' | 'duplicate_beacon' | 'trajectory_drift';
export type Severity = 'high' | 'medium' | 'low';

export interface Problem {
  id: string;
  type: ProblemType;
  severity: Severity;
  title: string;
  description: string;
  humanReadable: string;
  position: { x: number; y: number; z: number; floorId: string };
  evidence: string[];
  timestamp: number;
}

export interface FileRecord {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: number;
  status: 'processing' | 'success' | 'error';
}

export interface HeatmapCell {
  x: number;
  y: number;
  value: number;
  floorId: string;
}

export interface SceneState {
  selectedFloorId: string | null;
  selectedObject: { type: string; id: string } | null;
  isPlaying: boolean;
  playbackTime: number;
  playbackSpeed: number;
  focusPosition: { x: number; y: number; z: number } | null;
}

export interface FilterState {
  timeRange: { start: number; end: number };
  selectedFloors: string[];
  signalStrength: { min: number; max: number };
  showHeatmap: boolean;
  showTrajectory: boolean;
  showBeacons: boolean;
  showProblems: boolean;
}

export interface DataState {
  floors: FloorData[];
  beacons: BeaconData[];
  trajectories: TrajectoryPoint[];
  logs: DeviceLog[];
  problems: Problem[];
  heatmapData: HeatmapCell[];
  rawFiles: {
    floorModels: FileRecord[];
    trajectoryFiles: FileRecord[];
    logFiles: FileRecord[];
  };
  isLoading: boolean;
}

