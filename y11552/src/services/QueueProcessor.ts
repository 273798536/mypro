import { QueueDAO, FactDAO, AuditDAO } from '../database/dao';
import { FactStatus, RetryCategory, OperationType } from '../types';
import { config } from '../config';

function formatDateTime(date: Date): string {
  return date.toISOString();
}

export const QueueProcessor = {
  async processPendingRetries(): Promise<{ processed: number; success: number; failed: number; deadLetter: number }> {
    const pendingItems = await QueueDAO.findPendingRetries(50);
    let success = 0;
    let failed = 0;
    let deadLetter = 0;

    for (const item of pendingItems) {
      try {
        const result = await this.processRetry(item);
        if (result.success) {
          success++;
        } else if (result.deadLetter) {
          deadLetter++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Failed to process queue item ${item.queueId}:`, error);
        failed++;
      }
    }

    return {
      processed: pendingItems.length,
      success,
      failed,
      deadLetter
    };
  },

  async processRetry(item: any): Promise<{ success: boolean; deadLetter: boolean }> {
    const fact = await FactDAO.findByFactId(item.factId);
    if (!fact) {
      await QueueDAO.moveToDeadLetter(item.queueId, 'Fact not found');
      return { success: false, deadLetter: true };
    }

    const newRetryCount = item.retryCount + 1;

    if (newRetryCount >= item.maxRetries) {
      await QueueDAO.moveToDeadLetter(item.queueId, `Max retries exceeded (${item.maxRetries})`);
      await FactDAO.updateStatus(fact.factId, FactStatus.DEAD_LETTER);
      
      await AuditDAO.create(
        fact.factId,
        OperationType.RETRY,
        'system',
        'System',
        { status: fact.status, retryCount: fact.retryCount },
        { status: FactStatus.DEAD_LETTER, retryCount: newRetryCount },
        `达到最大重试次数(${item.maxRetries})，移入死信队列`
      );

      return { success: false, deadLetter: true };
    }

    const result = await this.attemptCompensation(fact, item.retryCategory);

    if (result.success) {
      await QueueDAO.complete(item.queueId);
      await FactDAO.updateStatus(fact.factId, FactStatus.VERIFIED);
      await FactDAO.updateRetryInfo(
        fact.factId,
        newRetryCount,
        item.retryCategory,
        formatDateTime(new Date())
      );

      await AuditDAO.create(
        fact.factId,
        OperationType.RETRY,
        'system',
        'System',
        { status: fact.status, retryCount: fact.retryCount },
        { status: FactStatus.VERIFIED, retryCount: newRetryCount },
        `第 ${newRetryCount} 次重试成功`
      );

      return { success: true, deadLetter: false };
    } else {
      await QueueDAO.updateRetry(item.queueId, result.error);
      await FactDAO.updateRetryInfo(
        fact.factId,
        newRetryCount,
        item.retryCategory,
        formatDateTime(new Date()),
        formatDateTime(new Date(Date.now() + config.retry.intervalMinutes * 60 * 1000))
      );

      await AuditDAO.create(
        fact.factId,
        OperationType.RETRY,
        'system',
        'System',
        { status: fact.status, retryCount: fact.retryCount },
        { status: FactStatus.RETRYING, retryCount: newRetryCount },
        `第 ${newRetryCount} 次重试失败: ${result.error || '未知错误'}`
      );

      return { success: false, deadLetter: false };
    }
  },

  async attemptCompensation(fact: any, category: RetryCategory): Promise<{ success: boolean; error?: string }> {
    switch (category) {
      case RetryCategory.MISSING_ATTACHMENT:
        if (fact.replenishPhotos.length > 0) {
          return { success: true };
        }
        return { success: false, error: '仍缺少补货照片' };

      case RetryCategory.EXTERNAL_API_DOWN:
        const hasReceipt = fact.externalReceipts.length > 0;
        const allSuccess = fact.externalReceipts.every((r: any) => r.status === 'success');
        if (hasReceipt && allSuccess) {
          return { success: true };
        }
        return { success: false, error: '外部回执仍未确认' };

      case RetryCategory.NETWORK_ISSUE:
        const networkSuccess = fact.externalReceipts.every((r: any) => r.status !== 'failed');
        if (networkSuccess) {
          return { success: true };
        }
        return { success: false, error: '网络问题仍存在' };

      case RetryCategory.DATA_CONFLICT:
        const inventory = fact.cabinetInventory;
        if (inventory.expectedQuantity === inventory.actualQuantity) {
          return { success: true };
        }
        return { success: false, error: `库存数量不一致: 期望${inventory.expectedQuantity}, 实际${inventory.actualQuantity}` };

      case RetryCategory.INVALID_DATA:
        return { success: false, error: '数据格式无效，需要人工处理' };

      default:
        return { success: false, error: '未知错误类型' };
    }
  },

  async retryDeadLetter(factId: string, operatorId: string, operatorName: string, newCategory?: RetryCategory): Promise<void> {
    const fact = await FactDAO.findByFactId(factId);
    if (!fact) {
      throw new Error('Fact not found');
    }

    if (fact.status !== FactStatus.DEAD_LETTER) {
      throw new Error('Fact is not in dead letter status');
    }

    const category = newCategory || fact.retryCategory || RetryCategory.UNKNOWN_ERROR;
    
    await QueueDAO.create(factId, category);
    await FactDAO.updateStatus(factId, FactStatus.RETRYING);

    await AuditDAO.create(
      factId,
      OperationType.RETRY,
      operatorId,
      operatorName,
      { status: FactStatus.DEAD_LETTER, retryCount: fact.retryCount },
      { status: FactStatus.RETRYING, retryCount: 0, retryCategory: category },
      `从死信队列恢复，重新进入重试队列`
    );
  },

  getCategoryDescription(category: RetryCategory): string {
    const descriptions: Record<RetryCategory, string> = {
      [RetryCategory.NETWORK_ISSUE]: '网络问题 - 网络恢复后可自动重试',
      [RetryCategory.INVALID_DATA]: '无效数据 - 需要人工修正后重试',
      [RetryCategory.MISSING_ATTACHMENT]: '缺少附件 - 补充照片后可通过',
      [RetryCategory.EXTERNAL_API_DOWN]: '外部系统不可用 - 系统恢复后自动重试',
      [RetryCategory.DATA_CONFLICT]: '数据冲突 - 库存数据不一致需核对',
      [RetryCategory.UNKNOWN_ERROR]: '未知错误 - 需要人工排查'
    };
    return descriptions[category] || '未知类型';
  }
};

let processorInterval: NodeJS.Timeout | null = null;

export function startQueueProcessor(intervalMs: number = 60000): void {
  if (processorInterval) {
    return;
  }

  console.log(`Starting queue processor with interval ${intervalMs}ms`);
  
  processorInterval = setInterval(async () => {
    try {
      const result = await QueueProcessor.processPendingRetries();
      if (result.processed > 0) {
        console.log(`Processed ${result.processed} items: ${result.success} success, ${result.failed} failed, ${result.deadLetter} dead letter`);
      }
    } catch (error) {
      console.error('Queue processor error:', error);
    }
  }, intervalMs);
}

export function stopQueueProcessor(): void {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
    console.log('Queue processor stopped');
  }
}
