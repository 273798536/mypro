export type RecordType = 'buoy' | 'model' | 'coordinate';
export type RecordStatus = 'normal' | 'duplicate' | 'conflict' | 'missing_camera';
export type BatchStatus = 'processing' | 'completed' | 'error';

export interface DataRecord {
  id: string;
  batchId: string;
  fileName: string;
  originalLine: number;
  sourceRemark: string;
  imageName?: string;
  type: RecordType;
  data: Record<string, any>;
  status: RecordStatus;
  processingOpinion?: string;
  duplicateOfId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  id: string;
  name: string;
  importTime: string;
  recordCount: number;
  status: BatchStatus;
  fileNames: string[];
}

export interface SectionData {
  id: string;
  recordId: string;
  sliceIndex: number;
  sliceData: number[][];
  conclusion: string;
  timestamp: string;
}

export interface ConflictInfo {
  recordAId: string;
  recordBId: string;
  field: string;
  valueA: any;
  valueB: any;
}

export type StatusLabelMap = Record<RecordStatus, { label: string; color: string; bg: string }>;
export type TypeLabelMap = Record<RecordType, { label: string; color: string; bg: string }>;
