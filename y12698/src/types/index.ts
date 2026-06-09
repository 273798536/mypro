export type CoordinateSystem = 'WGS84' | 'UTM51N' | 'LOCAL';

export type ReviewStatus = 'pending' | 'approved' | 'disputed';

export type DataVersion = 'V1' | 'V2' | 'V3';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CameraState {
  position: Vec3;
  target: Vec3;
}

export interface DataRecord {
  id: string;
  sourceFile: string;
  sourceLine: number;
  sourceNote: string;
  coordinateSystem: CoordinateSystem;
  x: number;
  y: number;
  z_m: number;
  temperature: number;
  flowRate: number;
  timeParam: string;
  conclusion: string;
  version: DataVersion;
  reviewStatus: ReviewStatus;
  isDuplicate: boolean;
  duplicateOf?: string;
  isOutOfBounds: boolean;
  outOfBoundsFields?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProfileVersion {
  id: string;
  recordId: string;
  version: DataVersion;
  imageName: string;
  imageDataUrl: string;
  note: string;
  createdAt: string;
}

export interface Viewpoint {
  id: string;
  name: string;
  camera: CameraState;
  thumbnail?: string;
  savedAt: string;
}

export interface ScreenshotItem {
  id: string;
  name: string;
  viewpointId?: string;
  viewpointName?: string;
  recordId?: string;
  timeParam: string;
  metadata: {
    coordinateSystem: CoordinateSystem;
    x: number;
    y: number;
    z_m: number;
    sourceFile: string;
    sourceLine: number;
    version: DataVersion;
    temperature: number;
    flowRate: number;
  };
  dataUrl: string;
  createdAt: string;
}

export interface ConclusionAnchor {
  id: string;
  recordId: string;
  timeParam: string;
  position: number;
}

export interface ThresholdConfig {
  temperatureMax: number;
  temperatureMin: number;
  flowRateMax: number;
  flowRateMin: number;
}

export type ColorLegendItem = {
  label: string;
  color: string;
  description: string;
};

export type LegendType = 'temperature' | 'flowRate' | 'depth' | 'status';
