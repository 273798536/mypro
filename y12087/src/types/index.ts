export interface VectorFieldFormula {
  id: string;
  name: string;
  description: string;
  fx: string;
  fy: string;
  fz: string;
  params: {
    xRange: [number, number];
    yRange: [number, number];
    zRange: [number, number];
    customParams?: Record<string, [number, number]>;
  };
  thresholds: {
    explosion: number;
    directionFlip: number;
    outOfBounds: number;
  };
  createdAt: string;
}

export interface SeedPoint {
  id: string;
  x: number;
  y: number;
  z: number;
  label?: string;
}

export interface StreamlinePoint {
  position: [number, number, number];
  velocity: [number, number, number];
  speed: number;
  curvature: number;
  timestamp: number;
}

export type AnomalyType = 'explosion' | 'direction_flip' | 'out_of_bounds';
export type StreamlineStatus = 'normal' | AnomalyType;

export interface AnomalyRecord {
  id: string;
  streamlineId: string;
  type: AnomalyType;
  position: [number, number, number];
  value: number;
  threshold: number;
  description: string;
  pointIndex: number;
}

export interface Streamline {
  id: string;
  seedPointId: string;
  points: StreamlinePoint[];
  status: StreamlineStatus;
  anomalies: AnomalyRecord[];
  colorAffected?: boolean;
}

export interface DetectionResult {
  id: string;
  formulaId: string;
  seedPoints: SeedPoint[];
  streamlines: Streamline[];
  anomalies: AnomalyRecord[];
  statistics: {
    totalStreamlines: number;
    normalCount: number;
    explosionCount: number;
    directionFlipCount: number;
    outOfBoundsCount: number;
  };
  runNumber: number;
  timestamp: string;
  isConsistent: boolean;
  hasColorScale: boolean;
  consistencyHash?: string;
  runHash?: string;
}

export interface Viewpoint {
  id: string;
  name: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  createdAt: number;
}

export interface FilterConditions {
  anomalyTypes: AnomalyType[];
  streamlineIds: string[];
  speedRange: [number, number];
  showOnlyAnomalies: boolean;
}

export interface ColorScale {
  min: number;
  max: number;
  colors: string[];
  enabled: boolean;
}

export interface ChangeRecord {
  id: string;
  type: 'formula' | 'detection' | 'color_scale' | 'viewpoint';
  description: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  affectedIds: string[];
  affectedAnomalyIds?: string[];
  anomaliesBefore?: number;
  anomaliesAfter?: number;
  timestamp: number;
}

export interface VectorFieldState {
  formulas: VectorFieldFormula[];
  currentFormulaId: string | null;
  seedPoints: SeedPoint[];
  colorScale: ColorScale | null;
  filterConditions: FilterConditions;
}

export interface UIState {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  selectedStreamlineId: string | null;
  selectedAnomalyId: string | null;
  hoveredPoint: [number, number, number] | null;
  isLoading: boolean;
  loadingMessage: string;
  loadingProgress: number;
  errorMessage: string | null;
}

export interface DetectionState {
  currentResult: DetectionResult | null;
  previousResult: DetectionResult | null;
  resultHistory: DetectionResult[];
  changeHistory: ChangeRecord[];
  savedViewpoints: Viewpoint[];
}
