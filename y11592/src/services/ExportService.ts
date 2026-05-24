import { Op } from 'sequelize';
import {
  WaveOrder,
  PickingDifference,
  ReviewScan,
  RetryQueue,
  OperationLog,
} from '../models';
import { RetryStatus, DataSourceType, OperationType } from '../types';
import logger from '../utils/logger';
import { operationLogService } from './OperationLogService';

export interface ExportOptions {
  batchId?: string;
  waveNos?: string[];
  startDate?: Date;
  endDate?: Date;
  statuses?: RetryStatus[];
  includeHistory?: boolean;
}

export interface ExportData {
  waveOrders: WaveOrder[];
  pickingDifferences: PickingDifference[];
  reviewScans: ReviewScan[];
  retryQueue: RetryQueue[];
  operationLogs?: OperationLog[];
  statistics: {
    totalWaveOrders: number;
    totalPickingDifferences: number;
    totalReviewScans: number;
    totalRetryQueue: number;
    byStatus: Record<string, number>;
  };
}

class ExportService {
  async export(options: ExportOptions, operatorId: string, operatorName?: string): Promise<ExportData> {
    logger.info('开始导出数据', { options, operatorId });

    const whereConditions: any = {};
    if (options.batchId) {
      whereConditions.batchId = options.batchId;
    }
    if (options.startDate && options.endDate) {
      whereConditions.createdAt = {
        [Op.between]: [options.startDate, options.endDate],
      };
    }

    const retryWhere = { ...whereConditions };
    if (options.statuses && options.statuses.length > 0) {
      retryWhere.status = { [Op.in]: options.statuses };
    }

    const [waveOrders, pickingDifferences, reviewScans, retryQueue] = await Promise.all([
      WaveOrder.findAll({
        where: whereConditions,
        order: [['createdAt', 'DESC']],
      }),
      PickingDifference.findAll({
        where: whereConditions,
        order: [['createdAt', 'DESC']],
      }),
      ReviewScan.findAll({
        where: whereConditions,
        order: [['createdAt', 'DESC']],
      }),
      RetryQueue.findAll({
        where: retryWhere,
        order: [['createdAt', 'DESC']],
      }),
    ]);

    let operationLogs: OperationLog[] = [];
    if (options.includeHistory && options.batchId) {
      operationLogs = await operationLogService.getBatchHistory(options.batchId);
    }

    const byStatus: Record<string, number> = {};
    for (const status of Object.values(RetryStatus)) {
      byStatus[status] = retryQueue.filter((r) => r.status === status).length;
    }

    const exportData: ExportData = {
      waveOrders,
      pickingDifferences,
      reviewScans,
      retryQueue,
      operationLogs,
      statistics: {
        totalWaveOrders: waveOrders.length,
        totalPickingDifferences: pickingDifferences.length,
        totalReviewScans: reviewScans.length,
        totalRetryQueue: retryQueue.length,
        byStatus,
      },
    };

    await operationLogService.createLog({
      entityType: 'retry_queue',
      entityId: 'export_' + Date.now(),
      operationType: OperationType.EXPORT,
      operatorId,
      operatorName,
      newValues: {
        options,
        statistics: exportData.statistics,
      },
      remark: '数据导出',
      batchId: options.batchId,
    });

    logger.info('导出完成', { statistics: exportData.statistics });

    return exportData;
  }

  async verifyConsistency(batchId: string): Promise<{
    consistent: boolean;
    issues: string[];
    details: Record<string, any>;
  }> {
    const issues: string[] = [];

    const retryItems = await RetryQueue.findAll({
      where: { batchId, status: RetryStatus.SUCCESS },
    });

    const waveOrderNos = new Set<string>();
    const waveSourceIds = new Set<string>();
    const diffSourceIds = new Set<string>();
    const scanSourceIds = new Set<string>();

    for (const item of retryItems) {
      if (item.sourceType === DataSourceType.WAVE_ORDER) {
        waveSourceIds.add(item.sourceId);
        const data = item.sourceData as any;
        if (data.waveNo) {
          waveOrderNos.add(data.waveNo);
        }
      } else if (item.sourceType === DataSourceType.PICKING_DIFFERENCE) {
        diffSourceIds.add(item.sourceId);
      } else if (item.sourceType === DataSourceType.REVIEW_SCAN) {
        scanSourceIds.add(item.sourceId);
      }
    }

    const [waveOrders, pickingDifferences, reviewScans] = await Promise.all([
      WaveOrder.findAll({
        where: { batchId, waveNo: { [Op.in]: Array.from(waveOrderNos) } },
      }),
      PickingDifference.findAll({
        where: { batchId },
      }),
      ReviewScan.findAll({
        where: { batchId },
      }),
    ]);

    if (waveOrders.length !== waveSourceIds.size) {
      issues.push(
        `波次单数量不一致: 重试成功 ${waveSourceIds.size} 条, 业务表 ${waveOrders.length} 条`
      );
    }

    const frozenItems = await RetryQueue.findAll({
      where: { batchId, status: RetryStatus.FROZEN },
    });

    if (frozenItems.length > 0) {
      issues.push(`存在 ${frozenItems.length} 条冻结数据，导出前需确认`);
    }

    const pendingItems = await RetryQueue.findAll({
      where: {
        batchId,
        status: { [Op.in]: [RetryStatus.PENDING, RetryStatus.FAILED, RetryStatus.PROCESSING] },
      },
    });

    if (pendingItems.length > 0) {
      issues.push(`存在 ${pendingItems.length} 条待处理数据`);
    }

    return {
      consistent: issues.length === 0,
      issues,
      details: {
        retryWaveOrders: waveSourceIds.size,
        businessWaveOrders: waveOrders.length,
        retryPickingDifferences: diffSourceIds.size,
        businessPickingDifferences: pickingDifferences.length,
        retryReviewScans: scanSourceIds.size,
        businessReviewScans: reviewScans.length,
        frozenCount: frozenItems.length,
        pendingCount: pendingItems.length,
      },
    };
  }

  async getRetryClassification(batchId?: string): Promise<{
    bySourceType: Record<string, number>;
    byErrorType: Record<string, number>;
    retryable: number;
    nonRetryable: number;
  }> {
    const where = batchId ? { batchId } : {};
    const failedItems = await RetryQueue.findAll({
      where: {
        ...where,
        status: { [Op.in]: [RetryStatus.FAILED, RetryStatus.DEAD_LETTER] },
      },
    });

    const bySourceType: Record<string, number> = {};
    const byErrorType: Record<string, number> = {};
    let retryable = 0;
    let nonRetryable = 0;

    for (const item of failedItems) {
      bySourceType[item.sourceType] = (bySourceType[item.sourceType] || 0) + 1;

      if (item.lastError) {
        const errorCategory = this.classifyError(item.lastError);
        byErrorType[errorCategory] = (byErrorType[errorCategory] || 0) + 1;

        if (this.isRetryableError(item.lastError)) {
          retryable++;
        } else {
          nonRetryable++;
        }
      }
    }

    return { bySourceType, byErrorType, retryable, nonRetryable };
  }

  private classifyError(error: string): string {
    if (error.includes('timeout') || error.includes('ETIMEDOUT')) return '超时';
    if (error.includes('connection') || error.includes('ECONN')) return '连接问题';
    if (error.includes('duplicate') || error.includes('Duplicate')) return '重复数据';
    if (error.includes('validation') || error.includes('Validation')) return '验证错误';
    if (error.includes('permission') || error.includes('Permission')) return '权限问题';
    return '其他错误';
  }

  private isRetryableError(error: string): boolean {
    const nonRetryablePatterns = [
      /duplicate/i,
      /validation/i,
      /permission/i,
      /not found/i,
      /invalid/i,
    ];
    return !nonRetryablePatterns.some((p) => p.test(error));
  }
}

export const exportService = new ExportService();
