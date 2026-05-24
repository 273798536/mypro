import dataStore from '../database/store';
import {
  ReportFilter,
  ReportSummary,
  ReimbursementStatus,
  RetryCategory,
  FailureReason,
  Reimbursement
} from '../types';
import { createObjectCsvWriter } from 'csv-writer';
import logger from '../utils/logger';

export class ReportService {
  static generateSummary(filter?: ReportFilter): ReportSummary {
    const reimbursements = this.applyFilter(dataStore.listReimbursements(), filter);
    const validForSummary = reimbursements.filter(r => r.isInSummary);

    const byStatus = this.initStatusRecord();
    const byRetryCategory = this.initRetryCategoryRecord();
    const byFailureReason = this.initFailureReasonRecord();

    let totalAmount = 0;
    let deadLetterCount = 0;
    let retryableCount = 0;

    for (const r of reimbursements) {
      const amount = r.isInSummary ? r.totalAmount : 0;
      
      byStatus[r.status].count++;
      byStatus[r.status].amount += amount;

      if (r.isInSummary) {
        totalAmount += r.totalAmount;
      }

      if (r.currentRetry) {
        byRetryCategory[r.currentRetry.category].count++;
        byRetryCategory[r.currentRetry.category].amount += amount;
        retryableCount++;
      }

      if (r.failureReason) {
        byFailureReason[r.failureReason].count++;
        byFailureReason[r.failureReason].amount += amount;
      }

      if (r.status === ReimbursementStatus.DEAD_LETTER) {
        deadLetterCount++;
      }
    }

    return {
      totalCount: reimbursements.length,
      totalAmount,
      byStatus,
      byRetryCategory,
      byFailureReason,
      deadLetterCount,
      retryableCount
    };
  }

  private static applyFilter(reimbursements: Reimbursement[], filter?: ReportFilter): Reimbursement[] {
    if (!filter) return reimbursements;

    return reimbursements.filter(r => {
      if (filter.startDate && r.createdAt < filter.startDate) return false;
      if (filter.endDate && r.createdAt > filter.endDate) return false;
      if (filter.status && r.status !== filter.status) return false;
      if (filter.department && r.department !== filter.department) return false;
      if (filter.retryCategory && r.currentRetry?.category !== filter.retryCategory) return false;
      if (filter.failureReason && r.failureReason !== filter.failureReason) return false;
      return true;
    });
  }

  private static initStatusRecord(): Record<ReimbursementStatus, { count: number; amount: number }> {
    const record = {} as Record<ReimbursementStatus, { count: number; amount: number }>;
    for (const status of Object.values(ReimbursementStatus)) {
      record[status] = { count: 0, amount: 0 };
    }
    return record;
  }

  private static initRetryCategoryRecord(): Record<RetryCategory, { count: number; amount: number }> {
    const record = {} as Record<RetryCategory, { count: number; amount: number }>;
    for (const category of Object.values(RetryCategory)) {
      record[category] = { count: 0, amount: 0 };
    }
    return record;
  }

  private static initFailureReasonRecord(): Record<FailureReason, { count: number; amount: number }> {
    const record = {} as Record<FailureReason, { count: number; amount: number }>;
    for (const reason of Object.values(FailureReason)) {
      record[reason] = { count: 0, amount: 0 };
    }
    return record;
  }

  static getFailedRecords(filter?: ReportFilter): Array<{
    reimbursementId: string;
    applicationNo: string;
    applicantName: string;
    status: ReimbursementStatus;
    failureReason?: FailureReason;
    failureDetails?: string;
    retryCount: number;
    lastRetryAt?: string;
    isInSummary: boolean;
  }> {
    const reimbursements = this.applyFilter(dataStore.listReimbursements(), filter);
    
    return reimbursements
      .filter(r => r.failureReason || r.status === ReimbursementStatus.FAILED || r.status === ReimbursementStatus.DEAD_LETTER)
      .map(r => ({
        reimbursementId: r.id,
        applicationNo: r.applicationNo,
        applicantName: r.applicantName,
        status: r.status,
        failureReason: r.failureReason,
        failureDetails: r.failureDetails,
        retryCount: r.currentRetry?.retryCount || 0,
        lastRetryAt: r.currentRetry?.lastRetryAt,
        isInSummary: r.isInSummary
      }));
  }

  static getRetryableRecords(): Array<{
    reimbursementId: string;
    applicationNo: string;
    applicantName: string;
    category: RetryCategory;
    retryCount: number;
    maxRetries: number;
    nextRetryAt: string;
    lastError?: string;
  }> {
    const pendingRetries = dataStore.getPendingRetries();
    
    return pendingRetries.map(item => {
      const reimbursement = dataStore.getReimbursement(item.reimbursementId);
      return {
        reimbursementId: item.reimbursementId,
        applicationNo: reimbursement?.applicationNo || '',
        applicantName: reimbursement?.applicantName || '',
        category: item.category,
        retryCount: item.retryCount,
        maxRetries: item.maxRetries,
        nextRetryAt: item.nextRetryAt,
        lastError: item.lastError
      };
    });
  }

  static getAuditTrail(reimbursementId: string): Array<{
    timestamp: string;
    fromStatus: string | null;
    toStatus: string;
    operatorName: string;
    reason: string;
    remarks?: string;
  }> {
    const reimbursement = dataStore.getReimbursement(reimbursementId);
    if (!reimbursement) return [];

    return reimbursement.statusLogs.map(log => ({
      timestamp: log.timestamp,
      fromStatus: log.fromStatus,
      toStatus: log.toStatus,
      operatorName: log.operatorName,
      reason: log.reason,
      remarks: log.remarks
    })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  static async exportToCsv(filter?: ReportFilter): Promise<string> {
    const reimbursements = this.applyFilter(dataStore.listReimbursements(), filter);
    const filePath = `exports/report_${Date.now()}.csv`;

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'applicationNo', title: '申请编号' },
        { id: 'applicantName', title: '申请人' },
        { id: 'department', title: '部门' },
        { id: 'totalAmount', title: '总金额' },
        { id: 'currency', title: '货币' },
        { id: 'status', title: '状态' },
        { id: 'failureReason', title: '失败原因' },
        { id: 'isInSummary', title: '计入汇总' },
        { id: 'createdAt', title: '创建时间' }
      ]
    });

    const records = reimbursements.map(r => ({
      id: r.id,
      applicationNo: r.applicationNo,
      applicantName: r.applicantName,
      department: r.department,
      totalAmount: r.totalAmount,
      currency: r.currency,
      status: r.status,
      failureReason: r.failureReason || '',
      isInSummary: r.isInSummary ? '是' : '否',
      createdAt: r.createdAt
    }));

    await csvWriter.writeRecords(records);
    logger.info(`报表导出完成: ${filePath}`);
    return filePath;
  }

  static getManagerDashboard(): {
    summary: ReportSummary;
    retryableByCategory: Record<RetryCategory, number>;
    deadLetterByReason: Record<FailureReason, number>;
    recentFailures: Array<{
      id: string;
      applicationNo: string;
      reason: FailureReason;
      details: string;
      time: string;
    }>;
  } {
    const summary = this.generateSummary();
    
    const retryableByCategory = {} as Record<RetryCategory, number>;
    for (const category of Object.values(RetryCategory)) {
      retryableByCategory[category] = summary.byRetryCategory[category].count;
    }

    const deadLetterByReason = {} as Record<FailureReason, number>;
    for (const reason of Object.values(FailureReason)) {
      deadLetterByReason[reason] = summary.byFailureReason[reason].count;
    }

    const deadLetters = dataStore.getDeadLetters({ resolved: false });
    const recentFailures = deadLetters.slice(0, 10).map(d => ({
      id: d.reimbursementId,
      applicationNo: dataStore.getReimbursement(d.reimbursementId)?.applicationNo || '',
      reason: d.failureReason,
      details: d.failureDetails,
      time: d.reportedAt
    }));

    return {
      summary,
      retryableByCategory,
      deadLetterByReason,
      recentFailures
    };
  }
}
