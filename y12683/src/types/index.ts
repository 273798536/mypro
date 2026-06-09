export type ImportStatus = 'new' | 'duplicate' | 'merged';
export type ConclusionResult = 'pass' | 'fail' | 'warning';
export type CollisionRisk = 'low' | 'medium' | 'high';
export type ImportRecordStatus = 'success' | 'duplicate_detected' | 'failed';

export interface CrossSectionPoint {
  x: number;
  y: number;
  z: number;
  intensity?: number;
}

export interface CrossSectionData {
  plane: 'XY' | 'XZ' | 'YZ';
  position: number;
  points: CrossSectionPoint[];
  boundaries: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
}

export interface PointCloudSlice {
  id: string;
  tankId: string;
  tankName: string;
  timestamp: string;
  pointCount: number;
  crossSection: CrossSectionData;
  importStatus: ImportStatus;
  fingerprint: string;
  pointDensity?: number;
  spacingDeviation?: number;
  collisionIndex?: number;
  collisionRisk?: CollisionRisk;
}

export interface MeasurementRecord {
  id: string;
  relatedSliceId: string;
  tankId: string;
  tankName: string;
  parameters: Record<string, number>;
  calculatedValues: Record<string, number>;
  formulaType: string;
  notes?: string;
  isSupplementary?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Conclusion {
  id: string;
  relatedMeasurementId: string;
  result: ConclusionResult;
  summary: string;
  details: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportRecord {
  id: string;
  timestamp: string;
  fingerprint: string;
  tankId: string;
  status: ImportRecordStatus;
  sliceCount: number;
  mergedWith?: string;
  message?: string;
}

export interface Tank {
  id: string;
  name: string;
  capacity: number;
  currentFill: number;
  shape: 'cylindrical' | 'spherical' | 'conical';
  radius: number;
  height: number;
}

export interface FormulaDefinition {
  id: string;
  name: string;
  formula: string;
  formulaLatex?: string;
  unit: string;
  scope: string;
  failureReasons: string[];
  parameters: {
    name: string;
    label: string;
    unit: string;
    min?: number;
    max?: number;
    defaultValue?: number;
  }[];
  calculate: (params: Record<string, number>) => number;
  validate: (params: Record<string, number>) => { valid: boolean; errors: string[] };
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingId?: string;
  existingSlice?: PointCloudSlice;
  options: ('merge' | 'replace' | 'cancel')[];
}

export interface CalculationResult {
  success: boolean;
  value?: number;
  unit?: string;
  errors?: string[];
  formulaUsed?: string;
}

export interface PointCloud3DPoint {
  x: number;
  y: number;
  z: number;
  color?: number;
}
