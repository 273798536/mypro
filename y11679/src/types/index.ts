export interface PointCloudData {
  id: string;
  name: string;
  source: string;
  points: Point[];
  offset: { x: number; y: number; z: number };
  coordinateSystem: string;
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  createdAt: Date;
}

export interface Point {
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
  intensity?: number;
}

export interface BoundingBox {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export type DamageLevel = 'none' | 'minor' | 'moderate' | 'severe' | 'critical';

export interface Annotation {
  id: string;
  pointcloudId: string;
  treeRowId: string;
  damageLevel: DamageLevel;
  notes: string;
  box: BoundingBox;
  sourcePhoto?: string;
  claimReportId?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface AnnotationVersion {
  id: string;
  annotationId: string;
  versionNumber: number;
  previousVersionId?: string;
  changes: Partial<Annotation>;
  changeDescription: string;
  modifiedBy: string;
  createdAt: Date;
}

export interface VersionRecord {
  id: string;
  timestamp: Date;
  description: string;
  annotations: Annotation[];
  pointclouds: PointCloudData[];
  author: string;
}

export interface ImportOptions {
  mode: 'ignore' | 'overwrite' | 'append';
}

export interface CoordinateOffsetResult {
  hasOffset: boolean;
  offsetDistance: number;
  threshold: number;
  pointcloudIds: [string, string];
}

export interface OverlapResult {
  hasOverlap: boolean;
  overlapPercentage: number;
  annotationIds: [string, string];
}

export const DAMAGE_LEVEL_COLORS: Record<DamageLevel, string> = {
  none: '#10B981',
  minor: '#84CC16',
  moderate: '#F59E0B',
  severe: '#EF4444',
  critical: '#7C3AED',
};

export const DAMAGE_LEVEL_LABELS: Record<DamageLevel, string> = {
  none: '无损',
  minor: '轻微',
  moderate: '中等',
  severe: '严重',
  critical: '毁灭性',
};
