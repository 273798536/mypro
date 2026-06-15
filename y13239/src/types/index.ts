export type MaterialStatus =
  | 'pending'
  | 'processing'
  | 'confirmed'
  | 'mismatch'
  | 'annotated';

export type MaterialSource =
  | 'contract_scan'
  | 'supplement'
  | 'manual'
  | 'system';

export type VersionSource =
  | 'contract_scan'
  | 'supplement_note'
  | 'manual_correction';

export type OperationAction =
  | 'create'
  | 'update'
  | 'confirm'
  | 'annotate'
  | 'export'
  | 'version_add'
  | 'status_change';

export interface Lesson {
  id: string;
  materialId: string;
  studentName: string;
  teacherName: string;
  lessonDate: string;
  duration: number;
  amount: number;
  progress: string;
  nameMismatch: boolean;
  mismatchNote?: string;
}

export interface MaterialVersion {
  id: string;
  materialId: string;
  version: string;
  source: VersionSource;
  uploadDate: string;
  suggestion: string;
  diffSummary: string;
  isLatest: boolean;
}

export interface Annotation {
  id: string;
  materialId: string;
  content: string;
  operator: string;
  createdAt: string;
  overridesOld: boolean;
  oldJudgment?: string;
}

export interface OperationLog {
  id: string;
  materialId: string;
  action: OperationAction;
  operator: string;
  timestamp: string;
  beforeChange?: string;
  afterChange?: string;
  description: string;
}

export interface Material {
  id: string;
  name: string;
  type: string;
  status: MaterialStatus;
  teacher: string;
  student: string;
  totalAmount: number;
  lessonCount: number;
  uploadDate: string;
  source: MaterialSource;
  hasNameMismatch: boolean;
  hasManualAnnotation: boolean;
  currentVersion: string;
  description?: string;
}

export interface FilterState {
  search: string;
  teacher: string;
  student: string;
  status: MaterialStatus | '';
  source: MaterialSource | '';
  dateRange: {
    start: string;
    end: string;
  };
}
