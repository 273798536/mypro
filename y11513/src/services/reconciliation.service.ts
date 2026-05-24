import { RecordType, TaskStatus, ProcessingReason } from '../types';
import { db } from '../models/database';
import { logger } from '../utils/logger';
import { recordService } from './record.service';
import { taskService } from './task.service';

export interface ReconciliationResult {
  totalRecords: number;
  consistentRecords: number;
  inconsistentRecords: number;
  duplicateRecords: number;
  taskStatusSummary: Record<string, number>;
  processingReasonSummary: Record<string, number>;
  inconsistencies: Array<{
    recordId: string;
    recordType: RecordType;
    issue: string;
    details: any;
  }>;
}

export class ReconciliationService {
  public async performReconciliation(): Promise<ReconciliationResult> {
    logger.info('Starting reconciliation process');

    const result: ReconciliationResult = {
      totalRecords: 0,
      consistentRecords: 0,
      inconsistentRecords: 0,
      duplicateRecords: 0,
      taskStatusSummary: {},
      processingReasonSummary: {},
      inconsistencies: [],
    };

    await Promise.all([
      this.reconcileRecordType(RecordType.BORROW_APPLICATION, result),
      this.reconcileRecordType(RecordType.EXPRESS_ORDER, result),
      this.reconcileRecordType(RecordType.COMPENSATION_RECORD, result),
      this.reconcileRecordType(RecordType.SHIFT_RECORD, result),
    ]);

    await this.reconcileTaskStatuses(result);
    await this.reconcileProcessingReasons(result);

    logger.info('Reconciliation completed', {
      totalRecords: result.totalRecords,
      consistentRecords: result.consistentRecords,
      inconsistentRecords: result.inconsistentRecords,
      duplicateRecords: result.duplicateRecords,
    });

    return result;
  }

  private async reconcileRecordType(
    recordType: RecordType,
    result: ReconciliationResult
  ): Promise<void> {
    const { records } = await recordService.getRecords(recordType, { pageSize: 10000 });

    result.totalRecords += records.length;

    for (const record of records) {
      const isConsistent = await this.checkRecordConsistency(record);

      if (isConsistent) {
        result.consistentRecords++;
      } else {
        result.inconsistentRecords++;
        result.inconsistencies.push({
          recordId: record.id,
          recordType,
          issue: 'Data inconsistency detected',
          details: {
            version: record.version,
            processingReason: record.processingReason,
          },
        });
      }

      if (record.processingReason === ProcessingReason.DUPLICATE_RECORD) {
        result.duplicateRecords++;
      }

      const reason = record.processingReason;
      result.processingReasonSummary[reason] = (result.processingReasonSummary[reason] || 0) + 1;
    }
  }

  private async checkRecordConsistency(record: any): Promise<boolean> {
    try {
      if (!record.id || !record.businessKey) {
        return false;
      }

      if (!record.importSource || !record.importSource.sourceFile) {
        return false;
      }

      if (record.version < 1) {
        return false;
      }

      if (!record.processingReason) {
        return false;
      }

      const history = await recordService.getRecordHistory(record.recordType, record.id);
      if (history.length === 0) {
        return false;
      }

      const versionHistory = history.filter((h: any) => h.afterChange?.version);
      const maxVersion = Math.max(...versionHistory.map((h: any) => h.afterChange.version), 0);
      if (maxVersion !== record.version) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error checking record consistency', {
        recordId: record.id,
        error: (error as Error).message,
      });
      return false;
    }
  }

  private async reconcileTaskStatuses(
    result: ReconciliationResult
  ): Promise<void> {
    const { tasks } = await taskService.getAllTasks({ pageSize: 10000 });

    for (const task of tasks) {
      const status = task.status;
      result.taskStatusSummary[status] = (result.taskStatusSummary[status] || 0) + 1;

      if (task.status === TaskStatus.PERMANENT_FAILED ||
          task.status === TaskStatus.WAITING_MANUAL) {
        result.inconsistencies.push({
          recordId: task.recordId,
          recordType: task.recordType,
          issue: `Task requires attention: ${task.status}`,
          details: {
            taskId: task.id,
            retryCount: task.retryCount,
            lastError: task.lastError,
          },
        });
      }
    }
  }

  private async reconcileProcessingReasons(
    result: ReconciliationResult
  ): Promise<void> {
    const feeRelatedReasons = [
      ProcessingReason.OVERDUE_FEE_CONFLICT,
      ProcessingReason.DAMAGE_FEE_CONFLICT,
      ProcessingReason.RENEWAL_FEE_OVERLAP,
      ProcessingReason.FEE_CALCULATION_ERROR,
    ];

    const recordTypes = [
      RecordType.BORROW_APPLICATION,
      RecordType.EXPRESS_ORDER,
      RecordType.COMPENSATION_RECORD,
    ];

    for (const recordType of recordTypes) {
      const { records } = await recordService.getRecords(recordType, { pageSize: 10000 });

      for (const record of records) {
        if (feeRelatedReasons.includes(record.processingReason as ProcessingReason)) {
          result.inconsistencies.push({
            recordId: record.id,
            recordType,
            issue: 'Fee calculation issue requires review',
            details: {
              processingReason: record.processingReason,
              sourceFile: record.importSource.sourceFile,
              lineNumber: record.importSource.originalLineNumber,
            },
          });
        }
      }
    }
  }

  public async replayExceptions(): Promise<{
    totalReplayed: number;
    successCount: number;
    failedCount: number;
    results: Array<{
      taskId: string;
      recordId: string;
      recordType: RecordType;
      previousStatus: TaskStatus;
      newStatus: TaskStatus;
      success: boolean;
    }>;
  }> {
    logger.info('Starting exception replay');

    const exceptionalStatuses = [
      TaskStatus.WAITING_MANUAL,
      TaskStatus.PERMANENT_FAILED,
    ];

    const results: Array<{
      taskId: string;
      recordId: string;
      recordType: RecordType;
      previousStatus: TaskStatus;
      newStatus: TaskStatus;
      success: boolean;
    }> = [];

    let successCount = 0;
    let failedCount = 0;

    for (const status of exceptionalStatuses) {
      const tasks = await taskService.getTasksByStatus(status);

      for (const task of tasks) {
        const previousStatus = task.status;

        try {
          await taskService.retryTask(task.id);

          const retryTask = await taskService.getTaskById(task.id);
          if (retryTask) {
            await taskService.processTask(retryTask);
          }

          const updatedTask = await taskService.getTaskById(task.id);
          const newStatus = updatedTask?.status || TaskStatus.PENDING;
          const success = newStatus === TaskStatus.SUCCESS || newStatus === TaskStatus.PENDING;

          if (success) {
            successCount++;
          } else {
            failedCount++;
          }

          results.push({
            taskId: task.id,
            recordId: task.recordId,
            recordType: task.recordType,
            previousStatus,
            newStatus,
            success,
          });

          logger.info('Exception replay result', {
            taskId: task.id,
            recordId: task.recordId,
            previousStatus,
            newStatus,
            success,
          });

        } catch (error) {
          failedCount++;
          results.push({
            taskId: task.id,
            recordId: task.recordId,
            recordType: task.recordType,
            previousStatus,
            newStatus: previousStatus,
            success: false,
          });

          logger.error('Exception replay failed', {
            taskId: task.id,
            error: (error as Error).message,
          });
        }
      }
    }

    logger.info('Exception replay completed', {
      totalReplayed: results.length,
      successCount,
      failedCount,
    });

    return {
      totalReplayed: results.length,
      successCount,
      failedCount,
      results,
    };
  }

  public async getStatistics(): Promise<{
    recordCounts: Record<string, number>;
    taskCounts: Record<string, number>;
    processingReasonCounts: Record<string, number>;
    recentImports: Array<{
      sourceFile: string;
      recordType: RecordType;
      count: number;
      timestamp: number;
    }>;
  }> {
    const recordCounts: Record<string, number> = {};
    const taskCounts: Record<string, number> = {};
    const processingReasonCounts: Record<string, number> = {};

    const recordTypes = [
      RecordType.BORROW_APPLICATION,
      RecordType.EXPRESS_ORDER,
      RecordType.COMPENSATION_RECORD,
      RecordType.SHIFT_RECORD,
    ];

    for (const recordType of recordTypes) {
      const { total } = await recordService.getRecords(recordType, { pageSize: 1 });
      recordCounts[recordType] = total;
    }

    const { tasks } = await taskService.getAllTasks({ pageSize: 10000 });
    for (const task of tasks) {
      taskCounts[task.status] = (taskCounts[task.status] || 0) + 1;
    }

    for (const recordType of recordTypes) {
      const { records } = await recordService.getRecords(recordType, { pageSize: 10000 });
      for (const record of records) {
        const reason = record.processingReason;
        processingReasonCounts[reason] = (processingReasonCounts[reason] || 0) + 1;
      }
    }

    const recentImports = await this.getRecentImports();

    return {
      recordCounts,
      taskCounts,
      processingReasonCounts,
      recentImports,
    };
  }

  private async getRecentImports(): Promise<Array<{
    sourceFile: string;
    recordType: RecordType;
    count: number;
    timestamp: number;
  }>> {
    const recentImports: Map<string, {
      sourceFile: string;
      recordType: RecordType;
      count: number;
      timestamp: number;
    }> = new Map();

    const recordTypes = [
      RecordType.BORROW_APPLICATION,
      RecordType.EXPRESS_ORDER,
      RecordType.COMPENSATION_RECORD,
      RecordType.SHIFT_RECORD,
    ];

    for (const recordType of recordTypes) {
      const { records } = await recordService.getRecords(recordType, { pageSize: 1000 });

      for (const record of records) {
        const key = `${record.importSource.sourceFile}_${recordType}`;
        const existing = recentImports.get(key);

        if (existing) {
          existing.count++;
          existing.timestamp = Math.max(existing.timestamp, record.createdAt);
        } else {
          recentImports.set(key, {
            sourceFile: record.importSource.sourceFile,
            recordType,
            count: 1,
            timestamp: record.createdAt,
          });
        }
      }
    }

    return Array.from(recentImports.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);
  }

  public async verifyCrossRecordConsistency(): Promise<{
    totalChecks: number;
    issues: Array<{
      type: string;
      applicationNo: string;
      issue: string;
      details: any;
    }>;
  }> {
    logger.info('Starting cross-record consistency verification');

    const issues: Array<{
      type: string;
      applicationNo: string;
      issue: string;
      details: any;
    }> = [];

    const { records: applications } = await recordService.getRecords(
      RecordType.BORROW_APPLICATION,
      { pageSize: 10000 }
    );

    const { records: expressOrders } = await recordService.getRecords(
      RecordType.EXPRESS_ORDER,
      { pageSize: 10000 }
    );

    const { records: compensations } = await recordService.getRecords(
      RecordType.COMPENSATION_RECORD,
      { pageSize: 10000 }
    );

    for (const app of applications) {
      const application = app as any;

      const relatedExpress = expressOrders.filter(
        (e: any) => e.relatedApplicationNo === application.applicationNo
      );

      const relatedCompensations = compensations.filter(
        (c: any) => c.relatedApplicationNo === application.applicationNo
      );

      if (relatedExpress.length > 1) {
        issues.push({
          type: 'multiple_express_orders',
          applicationNo: application.applicationNo,
          issue: 'Multiple express orders for single application',
          details: { expressCount: relatedExpress.length },
        });
      }

      if (relatedCompensations.length > 0) {
        const totalCompensation = relatedCompensations.reduce(
          (sum: number, c: any) => sum + c.amount,
          0
        );

        if (application.status === 'returned' && totalCompensation > 50) {
          issues.push({
            type: 'high_compensation',
            applicationNo: application.applicationNo,
            issue: 'High compensation amount for returned book',
            details: { totalCompensation, status: application.status },
          });
        }
      }

      const hasOverdueCompensation = relatedCompensations.some(
        (c: any) => c.compensationType === 'overdue'
      );
      const hasDamageCompensation = relatedCompensations.some(
        (c: any) => c.compensationType === 'damage'
      );

      if (hasOverdueCompensation && hasDamageCompensation) {
        const overdueRec = relatedCompensations.find((c: any) => c.compensationType === 'overdue');
        const damageRec = relatedCompensations.find((c: any) => c.compensationType === 'damage');
        issues.push({
          type: 'overlapping_fees',
          applicationNo: application.applicationNo,
          issue: 'Both overdue and damage fees - potential calculation overlap',
          details: {
            overdue: (overdueRec as any)?.amount,
            damage: (damageRec as any)?.amount,
          },
        });
      }
    }

    logger.info('Cross-record consistency verification completed', {
      totalChecks: applications.length,
      issuesFound: issues.length,
    });

    return {
      totalChecks: applications.length,
      issues,
    };
  }
}

export const reconciliationService = new ReconciliationService();
