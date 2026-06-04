export type PointStatus = 'normal' | 'out-of-bounds' | 'color-invalid' | 'missing-unit' | 'supplementary';

export type MaterialType = 'old-form' | 'supplementary' | 'field-note';

export type BoundaryType = 'core' | 'buffer' | 'experimental';

export type CollisionType = 'inside' | 'outside' | 'crossing';

export type ComparisonMode = 'none' | 'split' | 'overlay';

export type Severity = 'error' | 'warning' | 'info';

export type DetectionType = 'boundary' | 'color' | 'missing' | 'format';

export type ReviewResult = 'pass' | 'reject' | 'pending';

export type ReportStatus = 'approved' | 'rejected' | 'pending';

export interface TrackPoint {
  id: string;
  batchId: string;
  timestamp: number;
  originalLng: number;
  originalLat: number;
  lng?: number;
  lat?: number;
  elevation: number;
  color: string;
  sourceMaterial: string;
  operator: string;
  status: PointStatus;
  isSupplement: boolean;
  supplementNote?: string;
  supplementaryNote?: string;
  snappedLng?: number;
  snappedLat?: number;
  boundaryCollision?: {
    boundaryId: string;
    boundaryName: string;
    distance: number;
    type: CollisionType;
    threshold: number;
  };
  detectionResults?: DetectionResult[];
  reviewConclusion?: {
    result: ReviewResult;
    comment?: string;
    reviewer?: string;
    reviewTime?: number;
    reviewed: boolean;
    reviewerName?: string;
    reviewerNote?: string;
    correctionSuggestion?: string;
  };
}

export interface SourceMaterial {
  id: string;
  name: string;
  type: MaterialType;
  uploadTime: number;
  uploader: string;
  remark?: string;
  description?: string;
  pointCount: number;
  anomalyCount: number;
}

export interface ContourData {
  id: string;
  coordinates: [number, number][];
  elevation: number;
  isMajor: boolean;
}

export interface Boundary {
  id: string;
  name: string;
  coordinates: [number, number][];
  type: BoundaryType;
  description?: string;
}

export interface DetectionResult {
  id: string;
  pointId: string;
  type: DetectionType | PointStatus;
  severity: Severity;
  description: string;
  details?: string;
  confidence: number;
  sourceMaterialId: string;
  detectedAt: number;
}

export interface ReviewReport {
  id: string;
  batchId: string;
  batchName: string;
  reviewer: string;
  reviewTime: number;
  conclusions: {
    pointId: string;
    result: ReviewResult;
    comment?: string;
  }[];
  overallStatus: ReportStatus;
  totalPoints: number;
  anomalyPoints: number;
  passCount: number;
  rejectCount: number;
  pendingCount: number;
}

export interface Batch {
  id: string;
  name: string;
  createTime: number;
  operator: string;
  description?: string;
}

export interface QualityMetrics {
  completeness: number;
  accuracy: number;
  anomalyRate: number;
  totalPoints: number;
  normalCount: number;
  anomalyCount: number;
  byStatus: Record<string, number>;
  byMaterial: {
    materialId: string;
    materialName: string;
    total: number;
    anomalies: number;
  }[];
}

export interface AppState {
  currentBatch: Batch | null;
  trackPoints: TrackPoint[];
  sourceMaterials: SourceMaterial[];
  contours: ContourData[];
  boundaries: Boundary[];
  mapBounds: MapBounds;
  gridSize: number;
  isSnappingEnabled: boolean;
  snappingEnabled: boolean;
  showGrid: boolean;
  showBoundaries: boolean;
  showContours: boolean;
  reviewStatus: ReportStatus;
  selectedPointId: string | null;
  hoveredPointId: string | null;
  filters: {
    status: PointStatus | 'all';
    sourceMaterial: string[];
    searchText: string;
    materialId: string | null;
    operator: string | null;
  };
  comparisonMode: ComparisonMode;
  dataVersion: number;
  zoom: number;
  pan: { x: number; y: number };
  viewMode: 'dashboard' | 'report' | 'samples';
}

export interface Actions {
  setCurrentBatch: (batch: Batch | null) => void;
  setTrackPoints: (points: TrackPoint[]) => void;
  updatePoint: (pointId: string, updates: Partial<TrackPoint>) => void;
  deletePoint: (pointId: string) => void;
  addPoint: (point: TrackPoint) => void;
  setSourceMaterials: (materials: SourceMaterial[]) => void;
  setContours: (contours: ContourData[]) => void;
  setBoundaries: (boundaries: Boundary[]) => void;
  setMapBounds: (bounds: MapBounds) => void;
  setGridSize: (size: number) => void;
  setSnappingEnabled: (enabled: boolean) => void;
  setShowGrid: (show: boolean) => void;
  setShowBoundaries: (show: boolean) => void;
  setShowContours: (show: boolean) => void;
  setSelectedPointId: (id: string | null) => void;
  setHoveredPointId: (id: string | null) => void;
  setFilters: (filters: Partial<AppState['filters']>) => void;
  setComparisonMode: (mode: ComparisonMode | boolean) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setViewMode: (mode: AppState['viewMode']) => void;
  applySnapping: () => void;
  runDetection: () => void;
  exportData: () => {
    version: number;
    exportTime: number;
    batch: Batch | null;
    trackPoints: TrackPoint[];
    sourceMaterials: SourceMaterial[];
    metrics: QualityMetrics;
  };
  loadSampleData: (sampleId: string) => void;
  batchUpdatePoints: (pointIds: string[], updates: Partial<TrackPoint>) => void;
  submitForReview: () => ReviewReport | boolean;
  updateReviewConclusion: (pointId: string, conclusion: Partial<TrackPoint['reviewConclusion']>) => void;
  getFilteredPoints: () => TrackPoint[];
  getQualityMetrics: () => QualityMetrics;
}

export type AppStore = AppState & Actions;

export interface SampleScenario {
  id: string;
  name: string;
  description: string;
  hasBadData: boolean;
  badDataTypes: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  batch: Batch;
  materials: SourceMaterial[];
  points: TrackPoint[];
}

export interface MapBounds {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

export interface GridCell {
  x: number;
  y: number;
  lng: number;
  lat: number;
}
