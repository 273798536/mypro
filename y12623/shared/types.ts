export type RecordStatus = 'pending' | 'approved' | 'rejected' | 'anomaly';
export type AnomalyType = 'missing_material' | 'score_conflict' | 'duplicate';

export interface LoadingRecord {
  id: string;
  batchNo: string;
  platformNo: string;
  vehicleNo: string;
  sketchImage?: string;
  status: RecordStatus;
  anomalyType?: AnomalyType;
  source: string;
  importTime: number;
  latestScore?: number;
  latestScoreNote?: string;
  scorer?: string;
  scoreTime?: number;
  isSupplement: boolean;
  supplementFrom?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ScoreHistory {
  id: string;
  recordId: string;
  score: number;
  scoreNote?: string;
  reason: string;
  scorer: string;
  scoreTime: number;
  previousScore?: number;
}

export interface ProcessingNote {
  id: string;
  recordId: string;
  content: string;
  author: string;
  createTime: number;
}

export interface ImportResult {
  total: number;
  success: number;
  duplicates: number;
  anomalies: number;
  records: LoadingRecord[];
}

export interface ExportReport {
  id: string;
  period: string;
  totalRecords: number;
  approved: number;
  rejected: number;
  anomalies: number;
  averageScore: number;
  records: LoadingRecord[];
  exportTime: number;
}

export interface RecordDetail extends LoadingRecord {
  history: ScoreHistory[];
  notes: ProcessingNote[];
}

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  missing_material: '素材缺失',
  score_conflict: '评分冲突',
  duplicate: '重复导入',
};

export const STATUS_LABELS: Record<RecordStatus, string> = {
  pending: '待审核',
  approved: '通过',
  rejected: '驳回',
  anomaly: '异常',
};
