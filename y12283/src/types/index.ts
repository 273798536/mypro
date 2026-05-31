export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface VectorField {
  id: string;
  name: string;
  formula: {
    x: string;
    y: string;
    z: string;
  };
  parameters: Record<string, number>;
  createdAt: Date;
}

export type SeedPointStatus = 'normal' | 'missing_fields' | 'late_addition' | 'modified';

export interface SeedPoint {
  id: string;
  fieldId: string;
  position: Vector3;
  status: SeedPointStatus;
  remark: string;
  createdAt: Date;
  modifiedAt: Date;
}

export interface ExplosionRegion {
  startIndex: number;
  endIndex: number;
  maxDivergence: number;
}

export interface DataGapRegion {
  startIndex: number;
  endIndex: number;
  reason: string;
}

export interface StreamlineData {
  id: string;
  seedId: string;
  points: Vector3[];
  hasExplosion: boolean;
  explosionRegions: ExplosionRegion[];
  maxDivergence: number;
  dataGapRegions: DataGapRegion[];
}

export type HistoryActionType = 'create' | 'update' | 'delete';

export type HistoryEntityType = 'seedPoint' | 'vectorField';

export interface HistoryRecord {
  id: string;
  type: HistoryActionType;
  entityType: HistoryEntityType;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  remark: string;
  timestamp: Date;
}

export interface ExportCorrespondence {
  field: VectorField;
  seedPoints: SeedPoint[];
  streamlines: StreamlineData[];
  screenshot: string;
  exportedAt: Date;
}
