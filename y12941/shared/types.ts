export type MaterialSource = 'annotation_record' | 'segmentation_list' | 'training_sample';

export type Intent = 'refund' | 'exchange' | 'complaint' | 'inquiry' | 'technical_support' | 'other';

export type RiskLevel = 'high' | 'medium' | 'low' | 'normal';

export type BatchStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type VersionType = 'annotation' | 'prediction' | 'manual' | 'rollback';

export type ReviewStatus = 'approved' | 'rejected' | 'pending';

export type ReportFormat = 'pdf' | 'excel' | 'word';

export interface Conversation {
  id: string;
  sessionId: string;
  customerText: string;
  robotText?: string;
  fullContext?: string;
  truncated: boolean;
  truncationReason?: string;
  sourceFile: string;
  sourceRow: number;
  sourceType: MaterialSource;
  originalAnnotation: Intent;
  aiPrediction: Intent;
  aiConfidence: number;
  riskLevel: RiskLevel;
  driftScore: number;
  batchId: string;
  createdAt: string;
  updatedAt: string;
}

export interface VersionRecord {
  id: string;
  conversationId: string;
  versionType: VersionType;
  intent: Intent;
  confidence: number;
  remark?: string;
  operator: string;
  promptVersionId?: string;
  trainingSampleId?: string;
  createdAt: string;
  parentVersionId?: string;
  metadata?: Record<string, any>;
}

export interface ReviewRecord {
  id: string;
  conversationId: string;
  reviewer: string;
  originalIntent: Intent;
  correctedIntent: Intent;
  changeReason: string;
  reviewedAt: string;
  status: ReviewStatus;
}

export interface MaterialBatch {
  id: string;
  name: string;
  sourceType: MaterialSource;
  fileName: string;
  totalRecords: number;
  processedRecords: number;
  errorRecords: number;
  status: BatchStatus;
  errorMessage?: string;
  importedAt: string;
  createdBy?: string;
}

export interface PromptVersion {
  id: string;
  version: string;
  content: string;
  description: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface Report {
  id: string;
  batchIds: string[];
  format: ReportFormat;
  includeTechnicalDetails: boolean;
  fileName: string;
  filePath: string;
  fileSize: number;
  generatedBy: string;
  generatedAt: string;
}

export interface ReviewRequest {
  correctedIntent: Intent;
  changeReason: string;
  reviewer: string;
}

export interface ReviewResponse {
  success: boolean;
  conversation: Conversation;
  newVersion: VersionRecord;
}

export interface ReportRequest {
  format: ReportFormat;
  includeTechnicalDetails: boolean;
  includeRawData?: boolean;
  includeVersions?: boolean;
  batchIds?: string[];
  startDate?: string;
  endDate?: string;
  generatedBy?: string;
}

export interface ReportResponse {
  reportId: string;
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  generatedAt: string;
}

export interface DashboardStats {
  totalConversations: number;
  pendingReview: number;
  highRisk: number;
  driftRate: number;
  totalBatches: number;
  reviewedToday: number;
  intentDistribution: Record<Intent, number>;
  sourceDistribution: Record<MaterialSource, number>;
}

export interface VersionDiff {
  field: string;
  oldValue: string | number | boolean;
  newValue: string | number | boolean;
  changed: boolean;
}

export interface TruncationInfo {
  id: string;
  conversationId: string;
  reason: string;
  humanReadableReason: string;
  originalLength: number;
  truncatedLength: number;
  sourceFile: string;
  sourceRow: number;
}

export interface ToolCallError {
  id: string;
  conversationId: string;
  errorType: string;
  errorMessage: string;
  sourceFile: string;
  sourceRow: number;
  parameterName?: string;
  parameterValue?: string;
  humanReadableExplanation: string;
}

export const INTENT_LABELS: Record<Intent, string> = {
  refund: '退款申请',
  exchange: '换货申请',
  complaint: '投诉',
  inquiry: '咨询',
  technical_support: '技术支持',
  other: '其他'
};

export const SOURCE_TYPE_LABELS: Record<MaterialSource, string> = {
  annotation_record: '标注记录',
  segmentation_list: '切分清单',
  training_sample: '训练样本'
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
  normal: '正常'
};

export const VERSION_TYPE_LABELS: Record<VersionType, string> = {
  annotation: '原始标注',
  prediction: 'AI预测',
  manual: '人工修正',
  rollback: '版本回滚'
};

export interface ConversationQueryOptions {
  page?: number;
  pageSize?: number;
  riskLevel?: RiskLevel;
  sourceType?: MaterialSource;
  batchId?: string;
  hasDrift?: boolean;
  search?: string;
}

export interface ConversationListResult {
  items: Conversation[];
  total: number;
  page: number;
  pageSize: number;
}
