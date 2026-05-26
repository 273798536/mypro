export interface QuadricEquation {
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
  F: number;
  G: number;
  H: number;
  I: number;
  J: number;
}

export interface Bounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
}

export interface QuadricSurfaceParams {
  id: string;
  name: string;
  source?: string;
  equation: QuadricEquation;
  bounds: Bounds;
  sampleDensity: number;
  modificationHistory?: ModificationRecord[];
}

export interface ModificationRecord {
  timestamp: string;
  action: string;
  previousValue?: string;
  newValue?: string;
  user?: string;
}

export interface SlicePlane {
  normal: { x: number; y: number; z: number };
  distance: number;
  visible: boolean;
  showContours: boolean;
  contourCount: number;
}

export interface Preset {
  id: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
  source?: string;
  surface: QuadricSurfaceParams;
  slicePlane: SlicePlane;
  camera: {
    position: number[];
    target: number[];
  };
  modificationHistory?: ModificationRecord[];
}

export type WarningType = 'singularity' | 'sampling_gap' | 'slice_break' | 'degenerate' | 'out_of_bounds';
export type WarningSeverity = 'warning' | 'error';

export interface ComputationWarning {
  id: string;
  type: WarningType;
  severity: WarningSeverity;
  message: string;
  location?: { x: number; y: number; z: number };
  suggestion: string;
  timestamp: string;
}

export type ImportStrategy = 'ignore' | 'overwrite' | 'append';

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  overwritten: number;
  errors: string[];
  warnings: string[];
}

export interface HoverInfo {
  visible: boolean;
  position: { x: number; y: number };
  worldPosition: { x: number; y: number; z: number };
  value: number;
  normal?: { x: number; y: number; z: number };
  gradient?: { x: number; y: number; z: number };
}

export interface SurfaceVertex {
  x: number;
  y: number;
  z: number;
  valid: boolean;
}

export interface ContourLine {
  points: { x: number; y: number; z: number }[];
  value: number;
  valid: boolean;
}

export interface SliceResult {
  intersectionPoints: { x: number; y: number; z: number }[][];
  contours: ContourLine[];
  warnings: ComputationWarning[];
}

export type SurfaceType = 
  | 'ellipsoid'
  | 'hyperboloid_one'
  | 'hyperboloid_two'
  | 'paraboloid_elliptic'
  | 'paraboloid_hyperbolic'
  | 'cone'
  | 'cylinder_elliptic'
  | 'cylinder_hyperbolic'
  | 'cylinder_parabolic'
  | 'plane'
  | 'custom';

export interface SurfacePresetTemplate {
  name: string;
  type: SurfaceType;
  equation: QuadricEquation;
  bounds: Bounds;
  sampleDensity: number;
  description: string;
  formula: string;
}
