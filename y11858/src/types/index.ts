export interface OrbitalParams {
  id: string;
  name: string;
  n: number;
  l: number;
  m: number;
  isNormalized: boolean;
  normalizationFactor?: number;
  description: string;
}

export interface VisualizationSettings {
  resolution: number;
  gridSize: number;
  colorMap: ColorMapName;
  colorRange: [number, number];
  useLogScale: boolean;
  isoThreshold: number;
  isoOpacity: number;
  volumeOpacity: number;
  showIsosurface: boolean;
  showVolume: boolean;
}

export type ColorMapName = 'viridis' | 'plasma' | 'rainbow' | 'quantum';

export interface SliceSettings {
  xEnabled: boolean;
  yEnabled: boolean;
  zEnabled: boolean;
  xPosition: number;
  yPosition: number;
  zPosition: number;
  sliceOpacity: number;
  showGrid: boolean;
}

export interface ColorScaleIssue {
  type: 'compression' | 'outlier' | 'saturation';
  severity: 'warning' | 'error';
  message: string;
  suggestion: string;
}

export interface SliceViolation {
  axis: 'x' | 'y' | 'z';
  requestedValue: number;
  maxValue: number;
  correctedValue: number;
}

export interface NormalizationCheck {
  passed: boolean;
  integralValue: number;
  tolerance: number;
}

export interface ColorScaleCheck {
  passed: boolean;
  issues: ColorScaleIssue[];
}

export interface SliceBoundsCheck {
  passed: boolean;
  violations: SliceViolation[];
}

export type ResultClassification = 'ready' | 'needs-review' | 'misleading';

export interface RunResult {
  id: string;
  timestamp: number;
  params: OrbitalParams;
  vizSettings: VisualizationSettings;
  sliceSettings: SliceSettings;
  normalizationCheck: NormalizationCheck;
  colorScaleCheck: ColorScaleCheck;
  sliceBoundsCheck: SliceBoundsCheck;
  classification: ResultClassification;
  warnings: string[];
}

export interface ParameterChange {
  path: string;
  oldValue: unknown;
  newValue: unknown;
  label: string;
}

export interface ComparisonSession {
  id: string;
  orbitals: string[];
  syncCamera: boolean;
  layout: 'grid' | 'row' | 'column';
}
