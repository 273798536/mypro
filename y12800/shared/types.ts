export type SampleStatus =
  | 'pending_import'
  | 'pending_qc'
  | 'pending_review'
  | 'completed'
  | 'review_needed'
  | 'rejected';

export interface Sample {
  id: string;
  barcode: string;
  originalRowNumber: number;
  imageFileName: string | null;
  sourceRemark: string | null;
  cellCount: number | null;
  status: SampleStatus;
  qcConclusion: string | null;
  reviewNote: string | null;
  importBatchId: string;
  isDuplicate: boolean;
  duplicateGroupId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Annotation {
  id: string;
  sampleId: string;
  x: number;
  y: number;
  label: string;
  createdAt: string;
}

export interface ImportBatch {
  id: string;
  fileName: string;
  importedAt: string;
  totalCount: number;
  duplicateCount: number;
  importedBy: string;
}

export interface QCReport {
  id: string;
  generatedAt: string;
  totalSamples: number;
  completedCount: number;
  reviewNeededCount: number;
  rejectedCount: number;
  filePath: string;
}

export interface SampleWithAnnotations extends Sample {
  annotations: Annotation[];
}

export interface PagedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ImportResult {
  batch: ImportBatch;
  samples: Sample[];
  duplicates: Sample[][];
}

export interface SupervisorOverview {
  total: number;
  completed: number;
  reviewNeeded: number;
  rejected: number;
  pendingQc: number;
  pendingReview: number;
  byStatus: Record<SampleStatus, number>;
}

export interface DiffAnalysisResult {
  samples: Sample[];
  anomalies: Sample[];
}

export const SAMPLE_STATUS_LABELS: Record<SampleStatus, string> = {
  pending_import: '待导入',
  pending_qc: '待质控',
  pending_review: '待复核',
  completed: '已完成',
  review_needed: '需复核',
  rejected: '不可用',
};

export const SAMPLE_STATUS_COLORS: Record<SampleStatus, string> = {
  pending_import: 'bg-slate-100 text-slate-700 border-slate-200',
  pending_qc: 'bg-blue-50 text-blue-700 border-blue-200',
  pending_review: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  review_needed: 'bg-orange-50 text-orange-700 border-orange-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};
