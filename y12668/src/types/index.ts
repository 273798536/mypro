export type AnomalyType =
  | 'camera_view_lost'
  | 'projection_distortion'
  | 'scale_mismatch'
  | 'normal';

export type Severity = 'critical' | 'warning' | 'info';

export type RecordStatus = 'new' | 'merged' | 'supplemented' | 'resolved';

export interface ProjectionRecord {
  id: string;
  originalRowNumber: number;
  imageName: string;
  sourceNote: string;
  projectName: string;
  importedAt: string;
  importBatchId: string;
  anomalyType: AnomalyType;
  severity: Severity;
  status: RecordStatus;
  crossSectionUrl: string;
  conclusion: string;
  suggestion: string;
  duplicateOf?: string;
  supplementedFields?: string[];
  rawSnapshot: Record<string, string | number>;
  createdAt: string;
  updatedAt: string;
}

export interface FilterState {
  anomalyTypes: AnomalyType[];
  severities: Severity[];
  projectName?: string;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
  showNormal: boolean;
}

export interface TimelineVersion {
  batchId: string;
  importedAt: string;
  recordCount: number;
  anomalyCount: number;
  note: string;
}

export interface ImportResult {
  added: number;
  merged: number;
  duplicates: number;
  newAnomalies: number;
  batchId: string;
}

export const ANOMALY_LABELS: Record<AnomalyType, string> = {
  camera_view_lost: '相机视角丢失',
  projection_distortion: '投影畸变',
  scale_mismatch: '比例不匹配',
  normal: '正常',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: '严重',
  warning: '警告',
  info: '提示',
};

export const STATUS_LABELS: Record<RecordStatus, string> = {
  new: '新增',
  merged: '已合并',
  supplemented: '已补录',
  resolved: '已处理',
};

export const ANOMALY_COLORS: Record<AnomalyType, string> = {
  camera_view_lost: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  projection_distortion: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  scale_mismatch: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  normal: 'bg-lime-500/10 text-lime-400 border-lime-500/30',
};

export const SEVERITY_DOT: Record<Severity, string> = {
  critical: 'bg-rose-500',
  warning: 'bg-amber-500',
  info: 'bg-cyan-400',
};
