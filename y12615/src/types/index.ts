export type ReviewStatus = 'approved' | 'pending' | 'rejected' | 'review_needed';

export type AnomalyType = 
  | 'missing_material'
  | 'color_mismatch'
  | 'connection_error'
  | 'label_missing'
  | 'safety_hazard'
  | 'other';

export interface SourceInfo {
  rowNumber: number;
  imageName?: string;
  remark?: string;
  sourceLayer?: string;
}

export interface ColorRule {
  id: string;
  name: string;
  version: string;
  description: string;
  rules: {
    color: string;
    meaning: string;
    category: string;
  }[];
  createdAt: string;
}

export interface ScoreRecord {
  id: string;
  source: SourceInfo;
  deviceName: string;
  category: string;
  colorCode: string;
  status: ReviewStatus;
  score: number;
  maxScore: number;
  hasAnomaly: boolean;
  anomalyTypes: AnomalyType[];
  handler: string;
  reviewTime?: string;
  reviewComment?: string;
}

export interface AnomalyRecord {
  id: string;
  scoreRecordId: string;
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source: SourceInfo;
  suggestion: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
  resolver?: string;
}

export interface LayerItem {
  id: string;
  name: string;
  type: 'source' | 'annotation' | 'result' | 'review';
  visible: boolean;
  locked: boolean;
  dataRefs: string[];
  sourceInfo?: SourceInfo;
}

export interface Annotation {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: AnomalyType;
  label: string;
  color: string;
  layerId: string;
  scoreRecordId?: string;
  sourceInfo?: SourceInfo;
}

export interface ExportData {
  summary: {
    totalRecords: number;
    approvedCount: number;
    pendingCount: number;
    rejectedCount: number;
    anomalyCount: number;
  };
  records: ScoreRecord[];
  anomalies: AnomalyRecord[];
  exportedAt: string;
  colorRuleVersion: string;
}

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  missing_material: '素材缺失',
  color_mismatch: '颜色不符',
  connection_error: '连接错误',
  label_missing: '标签缺失',
  safety_hazard: '安全隐患',
  other: '其他异常'
};

export const STATUS_LABELS: Record<ReviewStatus, string> = {
  approved: '通过',
  pending: '待确认',
  rejected: '驳回',
  review_needed: '需复核'
};

export const STATUS_COLORS: Record<ReviewStatus, string> = {
  approved: 'bg-green-100 text-green-800 border-green-300',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
  review_needed: 'bg-orange-100 text-orange-800 border-orange-300'
};

export const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};
