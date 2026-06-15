export type RecordStatus = 'pending' | 'confirmed' | 'withdrawn' | 'annotated';
export type CommentType = 'normal' | 'override';

export interface StallRecord {
  id: string;
  stallNumber: string;
  status: RecordStatus;
  currentVersionId: string;
  latestCommentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Version {
  id: string;
  recordId: string;
  versionNumber: number;
  audioFileName: string;
  audioRemark: string;
  authorizationDate: string;
  importSource: string;
  importedBy: string;
  importedAt: string;
  changeDescription: string;
}

export interface Comment {
  id: string;
  recordId: string;
  versionId: string;
  content: string;
  author: string;
  createdAt: string;
  type: CommentType;
}

export interface Screenshot {
  id: string;
  recordId: string;
  versionId: string;
  dataUrl: string;
  description: string;
  uploadedAt: string;
}

export interface ExportLog {
  id: string;
  recordIds: string[];
  exportType: 'csv' | 'json';
  exportedAt: string;
  exportedBy: string;
}

export interface Filters {
  status?: RecordStatus;
  dateFrom?: string;
  dateTo?: string;
  stallNumber?: string;
  keyword?: string;
}

export interface AppState {
  records: StallRecord[];
  versions: Version[];
  comments: Comment[];
  screenshots: Screenshot[];
  exportLogs: ExportLog[];
  filters: Filters;
}

export interface ParsedAudioFile {
  fileName: string;
  stallNumber: string | null;
  remark: string;
  authorizationDate: string | null;
}

export const STATUS_LABELS: Record<RecordStatus, string> = {
  pending: '待复核',
  confirmed: '已确认',
  withdrawn: '已撤回',
  annotated: '有批注',
};

export const STATUS_COLORS: Record<RecordStatus, string> = {
  pending: 'bg-status-pending',
  confirmed: 'bg-status-confirmed',
  withdrawn: 'bg-status-withdrawn',
  annotated: 'bg-status-annotated',
};
