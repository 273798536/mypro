export type Vector3Tuple = [number, number, number];

export interface VoxelConfig {
  position: Vector3Tuple;
  size: number;
  color: string;
  height: number;
}

export interface CameraPreset {
  name: string;
  position: Vector3Tuple;
  target: Vector3Tuple;
  description: string;
}

export interface SceneState {
  voxels: VoxelConfig[];
  cameraPosition: Vector3Tuple;
  cameraTarget: Vector3Tuple;
  isCameraLost: boolean;
}

export interface ErosionParams {
  windSpeed: number;
  windDirection: number;
  grainSize: number;
  moisture: number;
  vegetation: number;
  erosionRate: number;
  threshold: number;
  cohesion: number;
}

export interface MeasurementRecord {
  id: string;
  timestamp: number;
  paramName: string;
  value: number;
  unit: string;
  source: string;
}

export interface ParamDependency {
  source: string;
  target: string;
  formula: string;
  description: string;
}

export type ExceptionType =
  | 'param_missing'
  | 'param_exceed'
  | 'camera_lost'
  | 'calc_error'
  | 'export_fail';

export type ExceptionStatus = 'pending' | 'processing' | 'resolved';

export interface ExceptionRecord {
  id: string;
  timestamp: number;
  type: ExceptionType;
  title: string;
  description: string;
  impact: string;
  suggestion: string;
  status: ExceptionStatus;
  relatedParams?: string[];
  context?: Record<string, unknown>;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface RunRecord {
  id: string;
  startTime: number;
  endTime: number;
  params: ErosionParams;
  exceptions: ExceptionRecord[];
  screenshots: string[];
  logs: LogEntry[];
  measurements: MeasurementRecord[];
}

export interface ExportConfig {
  includeScreenshots: boolean;
  includeParams: boolean;
  includeExceptions: boolean;
  includeLogs: boolean;
  format: 'pdf' | 'json' | 'html';
}
