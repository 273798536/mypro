import { createHash } from 'crypto';
import { RetryQueue } from '../models';
import { DataSourceType, IdempotencyStrategy, SourceData } from '../types';
import logger from '../utils/logger';

class IdempotencyService {
  generateIdempotencyKey(
    sourceType: DataSourceType,
    sourceId: string,
    batchId?: string
  ): string {
    const rawKey = `${sourceType}:${sourceId}${batchId ? `:${batchId}` : ''}`;
    return createHash('sha256').update(rawKey).digest('hex');
  }

  generateDataHash(data: SourceData): string {
    return createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  async checkExistingRecord(
    idempotencyKey: string
  ): Promise<RetryQueue | null> {
    return RetryQueue.findOne({
      where: { idempotencyKey },
    });
  }

  async applyStrategy(
    existingRecord: RetryQueue,
    newData: SourceData,
    strategy: IdempotencyStrategy,
    operatorId: string
  ): Promise<{ action: string; record?: RetryQueue }> {
    switch (strategy) {
      case IdempotencyStrategy.IGNORE:
        logger.info(`幂等性处理：忽略重复记录 ${existingRecord.idempotencyKey}`);
        return { action: 'ignored', record: existingRecord };

      case IdempotencyStrategy.OVERWRITE:
        logger.info(`幂等性处理：覆盖记录 ${existingRecord.idempotencyKey}`);
        existingRecord.sourceData = newData;
        existingRecord.changed('sourceData', true);
        await existingRecord.save();
        return { action: 'overwritten', record: existingRecord };

      case IdempotencyStrategy.APPEND:
        logger.info(`幂等性处理：追加记录 ${existingRecord.idempotencyKey}`);
        const appendedData = this.appendData(
          existingRecord.sourceData,
          newData
        );
        existingRecord.sourceData = appendedData;
        existingRecord.changed('sourceData', true);
        await existingRecord.save();
        return { action: 'appended', record: existingRecord };

      default:
        return { action: 'ignored', record: existingRecord };
    }
  }

  private appendData(
    existingData: Record<string, any>,
    newData: Record<string, any>
  ): Record<string, any> {
    const result = { ...existingData };
    
    for (const key of Object.keys(newData)) {
      if (Array.isArray(result[key]) && Array.isArray(newData[key])) {
        result[key] = [...result[key], ...newData[key]];
      } else if (
        typeof result[key] === 'object' &&
        result[key] !== null &&
        typeof newData[key] === 'object' &&
        newData[key] !== null
      ) {
        result[key] = this.appendData(result[key], newData[key]);
      } else {
        result[key] = newData[key];
      }
    }
    
    return result;
  }
}

export const idempotencyService = new IdempotencyService();
