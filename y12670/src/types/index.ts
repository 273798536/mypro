export interface ValidationError {
  message: string;
  suggestion?: string;
  field?: string;
  severity: 'error' | 'warning';
}

export interface SliceData {
  id: string;
  index: number;
  depth: number;
  depthUnit?: string;
  data: number[][];
  valueRange?: { min: number; max: number };
  outOfBoundsCount?: number;
}

export interface MeasurementRecord {
  id: string;
  name: string;
  timestamp: string;
  status: 'valid' | 'invalid' | 'review';
  errors: ValidationError[];
  slices: SliceData[];
  unit: string;
  expectedValueRange?: { min: number; max: number };
  metadata: Record<string, any>;
  importHash?: string;
}

export interface Viewpoint {
  id: string;
  name: string;
  camera: {
    position: [number, number, number];
    target: [number, number, number];
  };
  recordId?: string;
  sliceId?: string;
  created: string;
  note?: string;
}

export interface ImportResult {
  success: boolean;
  records: MeasurementRecord[];
  skipped: { name: string; reason: string }[];
  errors: ValidationError[];
}
