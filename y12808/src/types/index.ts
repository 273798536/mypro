export enum SampleStatus {
  PENDING = 'pending',
  TESTING = 'testing',
  COMPLETED = 'completed',
  ABNORMAL = 'abnormal'
}

export enum UserRole {
  TEACHER = 'teacher',
  STUDENT = 'student'
}

export interface Sample {
  id: string;
  barcode: string;
  batchNo: string;
  sampleType: string;
  status: SampleStatus;
  name?: string;
  concentration?: number;
  cellCount?: number;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CultureRecord {
  id: string;
  sampleId: string;
  content: string;
  operator: string;
  recordTime: string;
  imageName?: string;
}

export interface Conclusion {
  id: string;
  sampleId: string;
  result: string;
  conclusionType: string;
  reviewer?: string;
  reviewedAt?: string;
  isManualCorrected: boolean;
  correctionReason?: string;
}

export interface SourceTrace {
  id: string;
  sampleId: string;
  originalRow: number;
  sourceFile: string;
  sourceRemark?: string;
  importBatchId: string;
}

export interface ImportBatch {
  id: string;
  fileName: string;
  totalCount: number;
  cleanedCount: number;
  duplicateCount: number;
  importTime: string;
  operator: string;
  isReimport: boolean;
}

export interface CalculatorConfig {
  id: string;
  name: string;
  formula: string;
  unit: string;
  applicableScope: string;
  failureReasons: string[];
  inputFields: CalculatorField[];
}

export interface CalculatorField {
  key: string;
  label: string;
  unit: string;
  type: 'number' | 'select';
  options?: string[];
  defaultValue?: number | string;
}

export interface CorrectionRecord {
  id: string;
  sampleId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  operator: string;
  operateTime: string;
  reason: string;
}

export interface CleanIssue {
  row: number;
  field: string;
  issue: string;
  severity: 'error' | 'warning' | 'info';
}

export interface RawSampleRow {
  barcode?: string;
  batchNo?: string;
  sampleType?: string;
  name?: string;
  concentration?: string;
  cellCount?: string;
  remark?: string;
  [key: string]: string | undefined;
}
