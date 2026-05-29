import type { ConversationCard, DirtyDataResult, DirtyDataAction } from '@/types';

export class DirtyDataHandler {
  detectDirtyFields(card: Partial<ConversationCard>): string[] {
    const dirtyFields: string[] = [];

    if (!card.customerMessage) {
      dirtyFields.push('customerMessage');
    }

    if (card.emotion === null && card.emotionConfidence !== 0) {
      dirtyFields.push('emotion');
    }

    if (!card.botReply && (card.botReplyHistory?.length ?? 0) === 0) {
      dirtyFields.push('botReply');
    }

    if (card.intent === null) {
      dirtyFields.push('intent');
    }

    if (card.remarks && /备注|待补充|TODO|未核实|需确认/.test(card.remarks)) {
      dirtyFields.push('remarks');
    }

    return dirtyFields;
  }

  handleDirtyData(card: Partial<ConversationCard>): DirtyDataResult {
    const dirtyFields = this.detectDirtyFields(card);
    const isDirty = dirtyFields.length > 0;

    let action: DirtyDataAction = 'skip';
    let userHint: string | undefined;
    const processedCard = { ...card } as ConversationCard;

    processedCard.isDirty = isDirty;
    processedCard.dirtyFields = dirtyFields;
    processedCard.dirtyDataAction = 'skip';
    processedCard.botReplyHistory = card.botReplyHistory ?? [];
    processedCard.createdAt = card.createdAt ?? Date.now();
    processedCard.escalationReason = card.escalationReason ?? [];

    if (dirtyFields.includes('botReply')) {
      action = 'user_hint';
      userHint = '⚠️ 机器人回复缺失：此问题可能超出AI知识库范围，建议优先转人工';
      processedCard.dirtyDataAction = 'user_hint';
      processedCard.botReply = null;
      processedCard.botReplyHistory = [];
    }

    if (dirtyFields.includes('emotion')) {
      processedCard.emotion = 'neutral';
      processedCard.emotionConfidence = 0.5;
      action = action === 'skip' ? 'auto_complete' : action;
      processedCard.dirtyDataAction = action;
      if (!userHint) {
        userHint = 'ℹ️ 情绪数据缺失，已自动补全为"中性"，请注意甄别';
      }
    }

    if (dirtyFields.includes('intent')) {
      processedCard.intent = 'unknown';
      processedCard.intentConfidence = 0.3;
      action = action === 'skip' ? 'auto_complete' : action;
      processedCard.dirtyDataAction = action;
    }

    if (dirtyFields.includes('customerMessage')) {
      processedCard.customerMessage = '[客户消息为空]';
      action = 'warning';
      processedCard.dirtyDataAction = 'warning';
      userHint = '⚠️ 客户消息缺失，已标记为空消息';
    }

    if (dirtyFields.includes('remarks')) {
      action = action === 'skip' ? 'warning' : action;
      processedCard.dirtyDataAction = action;
      userHint = userHint || 'ℹ️ 此会话包含培训师备注，请留意额外信息';
    }

    if (!isDirty) {
      processedCard.dirtyDataAction = 'skip';
    }

    return { card: processedCard, action, userHint };
  }

  generateDirtyDataHint(fields: string[]): string {
    const hints: string[] = [];

    if (fields.includes('customerMessage')) {
      hints.push('客户消息为空');
    }
    if (fields.includes('emotion')) {
      hints.push('情绪数据缺失');
    }
    if (fields.includes('botReply')) {
      hints.push('机器人无回复');
    }
    if (fields.includes('intent')) {
      hints.push('意图识别为空');
    }
    if (fields.includes('remarks')) {
      hints.push('含培训师备注');
    }

    return hints.length > 0 ? `检测到：${hints.join('、')}` : '';
  }
}

export const dirtyDataHandler = new DirtyDataHandler();
