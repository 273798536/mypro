export interface ComplexNumber {
  re: number;
  im: number;
}

export interface ComplexMatrix {
  m11: ComplexNumber;
  m12: ComplexNumber;
  m21: ComplexNumber;
  m22: ComplexNumber;
}

export interface LayerRow {
  rowIndex: number;
  material: string;
  n: number | null;
  k: number | null;
  d: number | null;
  note: string;
  status: RowStatus;
}

export interface RowStatus {
  isEmpty: boolean;
  isComment: boolean;
  missingColumns: boolean;
  zeroThickness: boolean;
  missingRefractiveIndex: boolean;
  angleOutOfBounds: boolean;
  rawContent: string;
}

export interface WavelengthRange {
  start: number;
  end: number;
  step: number;
}

export interface AngleParams {
  angleDeg: number;
  polarization: 's' | 'p';
}

export interface InputSnapshot {
  layers: LayerRow[];
  angle: AngleParams;
  wavelengthRange: WavelengthRange;
  ambientN: number;
  substrateN: number;
}

export interface LayerMatrixSnapshot {
  layerIndex: number;
  material: string;
  n: number;
  k: number;
  d: number;
  delta: ComplexNumber;
  matrix: ComplexMatrix;
}

export interface WavelengthResult {
  wavelength: number;
  reflectance: number;
  transmittance: number;
  absorptance: number;
  layerMatrices: LayerMatrixSnapshot[];
  cumulativeMatrix: ComplexMatrix;
  traceId: string;
}

export type IssueType =
  | 'zero_thickness'
  | 'missing_n'
  | 'angle_oob'
  | 'missing_column'
  | 'empty_row'
  | 'comment_row';

export interface ValidationEntry {
  traceId: string;
  rowIndex: number;
  issueType: IssueType;
  description: string;
  rawContent: string;
}

export interface CalculationBatch {
  batchId: string;
  createdAt: string;
  input: InputSnapshot;
  results: WavelengthResult[];
  validations: ValidationEntry[];
  badRows: LayerRow[];
}

export const ISSUE_LABELS: Record<IssueType, string> = {
  zero_thickness: '层厚为零',
  missing_n: '折射率缺失',
  angle_oob: '角度越界',
  missing_column: '列缺失',
  empty_row: '空行',
  comment_row: '备注行',
};
