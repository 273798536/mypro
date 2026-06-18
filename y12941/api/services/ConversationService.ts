import { ConversationRepository, ConversationQueryOptions, ConversationListResult } from '../repositories/ConversationRepository.ts';
import { VersionRepository } from '../repositories/VersionRepository.ts';
import { ReviewRepository } from '../repositories/ReviewRepository.ts';
import { PromptRepository } from '../repositories/PromptRepository.ts';
import type { Conversation, ReviewRequest, ReviewResponse, VersionRecord, DashboardStats, Intent, TruncationInfo, ToolCallError } from '../../shared/types.ts';

export class ConversationService {
  private convRepo = new ConversationRepository();
  private versionRepo = new VersionRepository();
  private reviewRepo = new ReviewRepository();
  private promptRepo = new PromptRepository();

  getConversations(options: ConversationQueryOptions = {}): ConversationListResult {
    return this.convRepo.findAll(options);
  }

  getConversationById(id: string): Conversation | null {
    return this.convRepo.findById(id);
  }

  getVersions(conversationId: string): VersionRecord[] {
    return this.versionRepo.findByConversationId(conversationId);
  }

  reviewConversation(conversationId: string, request: ReviewRequest): ReviewResponse {
    const conversation = this.convRepo.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const latestVersion = this.versionRepo.getLatestVersion(conversationId);
    const activePrompt = this.promptRepo.findActive();

    const newVersion = this.versionRepo.create({
      conversationId,
      versionType: 'manual',
      intent: request.correctedIntent,
      confidence: 1.0,
      remark: request.changeReason,
      operator: request.reviewer,
      promptVersionId: activePrompt?.id,
      parentVersionId: latestVersion?.id
    });

    this.reviewRepo.create({
      conversationId,
      reviewer: request.reviewer,
      originalIntent: conversation.aiPrediction,
      correctedIntent: request.correctedIntent,
      changeReason: request.changeReason,
      status: 'approved'
    });

    this.convRepo.update(conversationId, {
      aiPrediction: request.correctedIntent,
      aiConfidence: 1.0,
      riskLevel: 'normal',
      driftScore: 0
    });

    const updatedConversation = this.convRepo.findById(conversationId)!;

    return {
      success: true,
      conversation: updatedConversation,
      newVersion
    };
  }

  rollbackToVersion(conversationId: string, versionId: string, operator: string): VersionRecord {
    const targetVersion = this.versionRepo.findById(versionId);
    if (!targetVersion || targetVersion.conversationId !== conversationId) {
      throw new Error('Version not found');
    }

    const latestVersion = this.versionRepo.getLatestVersion(conversationId);

    const rollbackVersion = this.versionRepo.create({
      conversationId,
      versionType: 'rollback',
      intent: targetVersion.intent,
      confidence: targetVersion.confidence,
      remark: `回滚到版本 ${versionId}，原因为：人工复核确认该版本正确`,
      operator,
      promptVersionId: targetVersion.promptVersionId,
      trainingSampleId: targetVersion.trainingSampleId,
      parentVersionId: latestVersion?.id
    });

    this.convRepo.update(conversationId, {
      aiPrediction: targetVersion.intent,
      aiConfidence: targetVersion.confidence
    });

    return rollbackVersion;
  }

  compareVersions(version1Id: string, version2Id: string) {
    return this.versionRepo.compareVersions(version1Id, version2Id);
  }

  getDashboardStats(): DashboardStats {
    const riskCounts = this.convRepo.countByRiskLevel();
    const sourceCounts = this.convRepo.countBySourceType();
    const intentCounts = this.convRepo.countByIntent();
    const driftRate = this.convRepo.getDriftRate();
    const totalConversations = this.convRepo.getTotalCount();
    const pendingReview = this.convRepo.getPendingReviewCount();
    const reviewedToday = this.convRepo.getReviewedTodayCount();
    const totalBatches = 3;

    return {
      totalConversations,
      pendingReview,
      highRisk: riskCounts.high,
      driftRate: Math.round(driftRate * 100) / 100,
      totalBatches,
      reviewedToday,
      intentDistribution: intentCounts,
      sourceDistribution: sourceCounts
    };
  }

  getTruncationInfos(): TruncationInfo[] {
    const result = this.convRepo.findAll({ pageSize: 100 });
    const truncationReasons: Record<string, string> = {
      'max_tokens_exceeded: context length > 4096 tokens': '对话内容过长，为保证分析准确性，系统自动保留了核心内容，省略了部分历史聊天记录',
      'field_length_limit: customer_text > 500 chars': '用户输入内容特别长，系统只保留了最关键的部分用于分析',
      'special_chars_stripped: invalid unicode removed': '原文包含一些特殊符号（如表情、乱码），系统已自动清理后再进行分析',
      'old_format_migration: pre-2026 schema migrated': '这是从旧系统导入的历史数据，格式与新版不完全一致，已做兼容性处理'
    };

    return result.items
      .filter(c => c.truncated && c.truncationReason)
      .map(c => ({
        id: 'trunc_' + c.id,
        conversationId: c.id,
        reason: c.truncationReason!,
        humanReadableReason: truncationReasons[c.truncationReason!] || c.truncationReason!,
        originalLength: c.fullContext?.length || 0,
        truncatedLength: c.customerText.length,
        sourceFile: c.sourceFile,
        sourceRow: c.sourceRow
      }));
  }

  getToolCallErrors(): ToolCallError[] {
    const errorData: Array<Omit<ToolCallError, 'id'> & { conversationId: string }> = [
      {
        conversationId: 'conv_sample_1',
        errorType: 'parameter_mismatch',
        errorMessage: 'Expected intent field to be one of [refund, exchange, complaint, inquiry, technical_support, other], got "refund " (with trailing space)',
        parameterName: 'intent',
        parameterValue: 'refund ',
        humanReadableExplanation: '在切分清单第7行，标注员在"refund"后面不小心多敲了一个空格，导致系统识别时参数匹配失败',
        sourceFile: 'segmentation_temp_20260612.csv',
        sourceRow: 7
      },
      {
        conversationId: 'conv_sample_2',
        errorType: 'empty_field',
        errorMessage: 'customer_text field is empty or contains only whitespace',
        parameterName: 'customer_text',
        parameterValue: '',
        humanReadableExplanation: '在标注记录Excel第45行，用户输入内容是空的，可能是导出时漏填或者用户根本没有发消息。这条数据建议直接忽略。',
        sourceFile: 'annotations_20260601_0610.xlsx',
        sourceRow: 45
      },
      {
        conversationId: 'conv_sample_3',
        errorType: 'missing_unit',
        errorMessage: 'Amount field missing currency unit, value is " 元" with leading space',
        parameterName: 'amount',
        parameterValue: ' 元',
        humanReadableExplanation: '在标注记录Excel第112行，"金额"字段只写了"元"，漏填了具体数字（应该是"299元"之类的）。这是从旧表导入时常见的问题。',
        sourceFile: 'annotations_20260601_0610.xlsx',
        sourceRow: 112
      }
    ];

    const conversations = this.convRepo.findAll({ pageSize: 100 });
    
    return errorData.map((e, i) => {
      const conv = conversations.items[i];
      return {
        ...e,
        id: 'error_' + (conv?.id || `err_${i}`),
        conversationId: conv?.id || e.conversationId
      };
    });
  }
}
