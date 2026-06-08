export type CageStatus = 'normal' | 'pending' | 'error';

export interface Cage {
  id: string;
  row: number;
  col: number;
  layer: number;
  x: number;
  y: number;
  z: number;
  status: CageStatus;
  remark: string;
}

export interface CameraView {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  savedAt: number;
}

export type ValidationIssueType = 'out_of_bounds' | 'floating' | 'camera_lost';

export interface ValidationIssue {
  type: ValidationIssueType;
  cageId?: string;
  message: string;
  detail: string;
}

export interface LayoutConfig {
  rows: number;
  cols: number;
  layers: number;
  spacingX: number;
  spacingY: number;
  spacingZ: number;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
}

export interface ExportReport {
  runId: string;
  exportedAt: string;
  cages: Cage[];
  config: LayoutConfig;
  issues: ValidationIssue[];
  cameraViews: CameraView[];
  summary: {
    total: number;
    normal: number;
    pending: number;
    error: number;
  };
}

export type SampleType = 'normal' | 'pending' | 'bad';
