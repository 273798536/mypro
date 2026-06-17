import type {
  Conversation,
  DashboardStats,
  VersionRecord,
  TruncationInfo,
  ToolCallError,
  MaterialBatch
} from '../../shared/types';
import type { Intent, RiskLevel, MaterialSource } from '../../shared/types';

export interface UIDashboardStats {
  total: number;
  reviewed: number;
  pending: number;
  driftRate: number;
  riskDistribution: Record<RiskLevel, number>;
  bySource: Record<MaterialSource, number>;
  byIntent: Record<Intent, number>;
  recentDrifts: UIDriftItem[];
}

export interface UIDriftItem {
  id: string;
  userInput: string;
  originalIntent: Intent;
  predictedIntent: Intent;
  riskLevel: RiskLevel;
  sourceType: MaterialSource;
  detectedAt: string;
}

export interface UIConversation extends Omit<Conversation, 'customerText' | 'robotText' | 'originalAnnotation' | 'aiPrediction' | 'aiConfidence' | 'driftScore'> {
  userInput: string;
  assistantResponse?: string;
  originalIntent: Intent;
  predictedIntent: Intent;
  annotationConfidence: number;
  predictionConfidence: number;
  hasDrift: boolean;
  isReviewed: boolean;
  currentIntent: Intent;
  remark?: string;
}

export interface UIVersionRecord extends Omit<VersionRecord, 'remark'> {
  changeRemark?: string;
}

export interface UITruncationInfo extends Omit<TruncationInfo, 'reason'> {
  technicalReason: string;
  humanReadableReason: string;
}

export interface UIToolCallError extends Omit<ToolCallError, 'errorMessage' | 'humanReadableExplanation' | 'sourceRow'> {
  technicalMessage: string;
  humanReadableMessage: string;
  lineNumber: number;
}

export interface UIMaterialBatch extends MaterialBatch {
  batchName: string;
  itemCount: number;
  importedBy: string;
  importedAt: string;
}

export function adaptDashboardStats(stats: DashboardStats, conversations: Conversation[]): UIDashboardStats {
  const reviewed = stats.totalConversations - stats.pendingReview;
  const recentDrifts = conversations
    .filter(c => c.driftScore > 0.5)
    .slice(0, 5)
    .map(c => adaptDriftItem(c));

  return {
    total: stats.totalConversations,
    reviewed,
    pending: stats.pendingReview,
    driftRate: Math.round(stats.driftRate * 100),
    riskDistribution: {
      high: (stats as any).highRisk || 0,
      medium: (stats as any).mediumRisk || 0,
      low: (stats as any).lowRisk || 0,
      none: (stats as any).normalRisk || 0
    },
    bySource: stats.sourceDistribution as Record<MaterialSource, number>,
    byIntent: stats.intentDistribution as Record<Intent, number>,
    recentDrifts
  };
}

export function adaptDriftItem(conv: Conversation): UIDriftItem {
  return {
    id: conv.id,
    userInput: conv.customerText,
    originalIntent: conv.originalAnnotation,
    predictedIntent: conv.aiPrediction,
    riskLevel: conv.riskLevel,
    sourceType: conv.sourceType,
    detectedAt: conv.updatedAt
  };
}

export function adaptConversation(conv: Conversation, versions: VersionRecord[]): UIConversation {
  const annotationVersion = versions.find(v => v.versionType === 'annotation');
  const isReviewed = versions.some(v => v.versionType === 'manual');

  return {
    ...conv,
    userInput: conv.customerText,
    assistantResponse: conv.robotText,
    originalIntent: conv.originalAnnotation,
    predictedIntent: conv.aiPrediction,
    annotationConfidence: annotationVersion?.confidence || 0.8,
    predictionConfidence: conv.aiConfidence,
    hasDrift: conv.driftScore > 0,
    isReviewed,
    currentIntent: conv.aiPrediction,
    remark: (conv as any).remark
  };
}

export function adaptVersionRecord(version: VersionRecord): UIVersionRecord {
  return {
    ...version,
    changeRemark: version.remark
  };
}

export function adaptTruncationInfo(info: TruncationInfo): UITruncationInfo {
  return {
    ...info,
    technicalReason: info.reason,
    humanReadableReason: info.humanReadableReason
  };
}

export function adaptToolCallError(error: ToolCallError): UIToolCallError {
  return {
    ...error,
    technicalMessage: error.errorMessage,
    humanReadableMessage: error.humanReadableExplanation,
    lineNumber: error.sourceRow
  };
}

export function adaptMaterialBatch(batch: MaterialBatch): UIMaterialBatch {
  return {
    ...batch,
    batchName: batch.name,
    itemCount: batch.totalRecords,
    importedBy: batch.createdBy || 'system',
    importedAt: batch.importedAt
  };
}

export function adaptConversationList(result: { items: Conversation[]; total: number; page: number; pageSize: number }, versionsMap: Record<string, VersionRecord[]> = {}) {
  return {
    items: result.items.map(c => adaptConversation(c, versionsMap[c.id] || [])),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize
  };
}
