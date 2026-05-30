export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Dimensions {
  width: number;
  height: number;
  depth: number;
}

export interface CargoItem {
  id: string;
  name: string;
  weight: number;
  position: Position;
  dimensions: Dimensions;
  color: string;
}

export interface BallastTank {
  id: string;
  name: string;
  capacity: number;
  currentLevel: number;
  position: Position;
  dimensions: Dimensions;
}

export interface StabilityResult {
  centerOfGravity: Position;
  heelAngle: number;
  trimAngle: number;
  metacentricHeight: number;
  isStable: boolean;
  warnings: string[];
}

export interface DataSource {
  vesselModel: string;
  ballastReport: string;
  stabilityReport: string;
}

export type RecordStatus = 'normal' | 'warning' | 'danger';

export interface LoadingRecord {
  id: string;
  name: string;
  status: RecordStatus;
  vesselName: string;
  timestamp: string;
  source: DataSource;
  cargo: CargoItem[];
  ballast: BallastTank[];
  stability: StabilityResult;
}

export interface ViewState {
  id: string;
  name: string;
  cameraPosition: Position;
  target: Position;
}

export interface FilterState {
  status: RecordStatus | 'all';
}
