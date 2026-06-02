export type Embedding3D = [number, number, number];

export interface DataPointSource {
  fileName: string;
  rowIndex: number;
  fieldMapping: Record<string, string>;
  rawRecord: Record<string, string | number | boolean | null>;
}

export interface DataPoint {
  id: string;
  vector: number[];
  embedding: Embedding3D;
  trueLabel: string;
  predictedLabel?: string;
  group: string;
  confidence: number;
  confidenceUpdatedAt?: string;
  confidenceUpdatedBy?: string;
  isOccluded?: boolean;
  occlusionReason?: string;
  screenshots: ScreenshotRef[];
  source?: DataPointSource;
}

export interface ScreenshotRef {
  id: string;
  timestamp: string;
  thumbnail: string;
  dataPoints: string[];
  viewState: CameraState;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}

export interface VectorQualityStats {
  nanCount: number;
  infinityCount: number;
  outlierCount: number;
  zeroVectorCount: number;
  inconsistentDimensionCount: number;
  expectedDimension: number;
  validVectorRate: number;
  outlierPointIds: string[];
  invalidPointIds: string[];
}

export interface DataQualityReport {
  hasMissingVectors: boolean;
  missingVectorCount: number;
  hasMissingLabels: boolean;
  missingLabelCount: number;
  hasUnevenGroups: boolean;
  groupDistribution: Record<string, number>;
  overlapScore: number;
  stabilityScore: number;
  vectorStats: VectorQualityStats;
  hasInvalidVectors: boolean;
  hasOutliers: boolean;
  hasDimensionIssues: boolean;
}

export interface FilterState {
  selectedLabels: string[];
  confidenceRange: [number, number];
  selectedGroups: string[];
  showOverlapOnly: boolean;
  showOccluded: boolean;
}

export interface AppState {
  dataPoints: DataPoint[];
  selectedPointIds: string[];
  filters: FilterState;
  qualityReport: DataQualityReport | null;
  showOverlapHulls: boolean;
  datasetName: string;
  overlapRegions: OverlapRegion[];
}

export interface OverlapRegion {
  id: string;
  labels: [string, string];
  center: Embedding3D;
  size: number;
  pointCount: number;
}

export type ExampleType = 'overlap' | 'occlusion' | 'instability';

export const CATEGORY_COLORS: Record<string, string> = {
  '类别A': '#00D4FF',
  '类别B': '#FF00AA',
  '类别C': '#00FF88',
  '类别D': '#FFAA00',
  '类别E': '#B388FF',
};

export const DEFAULT_COLORS = [
  '#00D4FF',
  '#FF00AA',
  '#00FF88',
  '#FFAA00',
  '#B388FF',
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
];
