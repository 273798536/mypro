export interface Point {
  x: number;
  y: number;
  timestamp?: number;
}

export interface Track {
  id: string;
  name: string;
  points: Point[];
  color: string;
  visible: boolean;
  batchId: string;
  isFlipped: boolean;
  createdAt: Date;
}

export type AnnotationType = 'normal' | 'abnormal' | 'pending';
export type AnnotationStatus = 'draft' | 'confirmed' | 'rejected';

export interface Annotation {
  id: string;
  trackId: string;
  x: number;
  y: number;
  type: AnnotationType;
  status: AnnotationStatus;
  note: string;
  createdAt: Date;
}

export type ActionType = 'add' | 'update' | 'delete' | 'flip' | 'import';

export interface HistoryRecord {
  id: string;
  actionType: ActionType;
  description: string;
  beforeState: {
    tracks: Track[];
    annotations: Annotation[];
  };
  afterState: {
    tracks: Track[];
    annotations: Annotation[];
  };
  timestamp: Date;
}

export interface CanvasState {
  tracks: Track[];
  annotations: Annotation[];
  history: HistoryRecord[];
  historyIndex: number;
  selectedTrackId: string | null;
  selectedAnnotationId: string | null;
  zoom: number;
  pan: { x: number; y: number };
  currentTool: ToolType;
}

export type ToolType = 'select' | 'pan' | 'annotate-normal' | 'annotate-abnormal' | 'annotate-pending';

export type ImportErrorType = 'missing_scorecard' | 'invalid_format' | 'duplicate_batch' | 'parse_error';
export type ImportWarningType = 'flipped_coordinates' | 'potential_duplicate' | 'out_of_bounds';

export interface ImportError {
  type: ImportErrorType;
  message: string;
  actionableHint: string;
}

export interface ImportWarning {
  type: ImportWarningType;
  message: string;
  autoFixed: boolean;
}

export interface ImportResult {
  success: boolean;
  tracks?: Track[];
  errors?: ImportError[];
  warnings?: ImportWarning[];
}

export interface ExportSummary {
  trackCount: number;
  annotationCount: number;
  abnormalCount: number;
  pendingCount: number;
  overallStatus: 'pass' | 'pending' | 'fail';
  exportedAt: Date;
}

export type ExportFormat = 'json' | 'csv' | 'pdf';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}
