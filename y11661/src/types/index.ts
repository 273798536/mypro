export interface DataSource {
  fileName: string;
  lineNumber: number;
}

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface Position2D {
  x: number;
  z: number;
}

export interface Dimensions {
  width: number;
  height: number;
  depth: number;
}

export interface Shelf {
  id: string;
  code: string;
  row: number;
  col: number;
  level: number;
  position: Position3D;
  dimensions: Dimensions;
  heatValue: number;
  source: DataSource;
}

export type RobotStatus = 'moving' | 'waiting' | 'picking' | 'blocked';

export interface RobotTrajectory {
  id: string;
  robotId: string;
  timestamp: number;
  position: Position3D;
  speed: number;
  status: RobotStatus;
  source: DataSource;
}

export interface OrderHeat {
  id: string;
  shelfId: string;
  timestamp: number;
  pickCount: number;
  source: DataSource;
}

export type AlertType = 'coordinate_flip' | 'heat_overflow' | 'trajectory_collision' | 'data_invalid' | 'out_of_bounds';
export type AlertSeverity = 'warning' | 'error' | 'critical';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  source: DataSource & {
    field: string;
    rawValue: string;
  };
  timestamp: number;
  resolved: boolean;
  position?: Position3D;
  correction?: {
    before: string;
    after: string;
    operator: string;
    timestamp: number;
  };
}

export interface Aisle {
  id: string;
  code: string;
  startPoint: Position2D;
  endPoint: Position2D;
  width: number;
  blockageLevel: number;
  source: DataSource;
}

export interface CorrectionRecord {
  id: string;
  alertId: string;
  before: string;
  after: string;
  operator: string;
  timestamp: number;
  reason: string;
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface FilterState {
  timeRange: TimeRange | null;
  heatThreshold: {
    min: number;
    max: number;
  };
  alertTypes: AlertType[];
  showOnlyUnresolved: boolean;
  selectedRobots: string[];
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  speed: number;
  duration: number;
  selectedRobotId: string | null;
}

export interface HoverInfo {
  type: 'shelf' | 'robot' | 'aisle' | 'alert';
  id: string;
  position: Position3D;
  data: Record<string, unknown>;
}

export interface HeatColorStop {
  value: number;
  color: string;
}

export interface ExportOptions {
  format: 'png' | 'jpg' | 'pdf' | 'xlsx';
  includeWatermark: boolean;
  includeSourceInfo: boolean;
  includeCorrections: boolean;
}
