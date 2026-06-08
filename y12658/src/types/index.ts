export type CoordinateSystem = 'WGS84' | 'CARTESIAN' | 'LOCAL' | 'UNKNOWN';

export type AbnormalType = 'OUT_OF_BOUNDS' | 'COORDINATE_MIX' | 'DUPLICATE';

export interface SourceMeta {
  sourceFileName: string;
  originalLineNumber: number;
  importBatchId: string;
  remark?: string;
}

export interface AbnormalFlag {
  type: AbnormalType;
  detail: string;
  resolved: boolean;
}

export interface CoordinateRecord {
  id: string;
  deviceId: string;
  x: number;
  y: number;
  z: number;
  value: number;
  coordinateSystem: CoordinateSystem;
  timestamp: string;
  hash: string;
  conclusion?: string;
  sourceMeta: SourceMeta;
  abnormalFlags: AbnormalFlag[];
}

export interface ViewpointSnapshot {
  id: string;
  name: string;
  camera: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  remark?: string;
  createdAt: string;
}

export interface TimeConclusion {
  id: string;
  timestamp: string;
  parameterValue: number;
  conclusionText: string;
  linkedRecordIds: string[];
}

export type Resolution = '1080p' | '2K' | '4K';

export interface ExportChecklist {
  viewpoint: boolean;
  legend: boolean;
  outOfBounds: boolean;
}

export interface ExportScreenshot {
  id: string;
  filename: string;
  viewpointId?: string;
  hasLegend: boolean;
  hasWatermark: boolean;
  resolution: Resolution;
  checklist: ExportChecklist;
  createdAt: string;
  dataUrl?: string;
}

export interface ImportResult {
  total: number;
  inserted: number;
  duplicates: number;
  mixed: number;
  outOfBounds: number;
  batchId: string;
}

export interface ColorRange {
  min: number;
  max: number;
}
