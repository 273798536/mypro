export interface Sample {
  id: string;
  vector: number[];
  predictedLabel: string;
  trueLabel: string;
  isMisjudged: boolean;
  confidence: number;
}

export interface ProjectionPoint {
  sampleId: string;
  x: number;
  y: number;
  z: number;
}

export interface Viewpoint {
  id: string;
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  timestamp: number;
}

export interface DimensionReductionConfig {
  method: 'pca' | 'tsne' | 'umap';
  params: Record<string, number>;
}

export interface MergeDiff {
  sampleId: string;
  field: string;
  sourceValue: string | number[];
  targetValue: string | number[];
  resolution: 'source' | 'target' | 'unresolved';
}

export interface OverlapRegion {
  labels: [string, string];
  center: [number, number, number];
  radius: number;
}

export interface OutlierInfo {
  sampleId: string;
  distance: number;
  isOccluded: boolean;
  displacedPosition: [number, number, number];
}

export const CATEGORY_COLORS: Record<string, string> = {
  A: '#00ffc8',
  B: '#4d9fff',
  C: '#c084fc',
};

export const MISJUDGED_COLOR = '#ff6b35';
export const OVERLAP_COLOR = '#ff2d78';
export const OUTLIER_COLOR = '#fbbf24';
