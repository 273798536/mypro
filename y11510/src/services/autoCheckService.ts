import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { ExceptionStatus, Role } from '../types';
import { stateMachine } from './stateMachine';
import logger from '../utils/logger';

interface CheckResult {
  checkType: string;
  passed: boolean;
  issuesFound: number;
  details: any;
}

export class AutoCheckService {
  async runAllChecks(): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    results.push(await this.checkDuplicateImports());
    results.push(await this.checkPermissionConsistency());
    results.push(await this.checkExceptionRetention());
    results.push(await this.checkExportConsistency());
    results.push(await this.checkAuditLogIntegrity());

    for (const result of results) {
      await db('auto_check_results').insert({
        id: uuidv4(),
        check_type: result.checkType,
        details: JSON.stringify(result.details),
        issues_found: result.issuesFound,
        passed: result.passed,
        checked_at: new Date(),
      });
    }

    logger.info('Auto-check completed', {
      totalChecks: results.length,
      failedChecks: results.filter((r) => !r.passed).length,
    });

    return results;
  }

  async checkDuplicateImports(): Promise<CheckResult> {
    const duplicates = await db
      .select('borrow_application_id')
      .count('* as count')
      .from('exception_receipts')
      .where('is_deleted', false)
      .groupBy('borrow_application_id')
      .havingRaw('count > 1');

    const issues: any[] = [];
    for (const dup of duplicates) {
      const receipts = await db('exception_receipts')
        .where('borrow_application_id', dup.borrow_application_id)
        .andWhere('is_deleted', false)
        .select('id', 'receipt_no', 'created_at', 'batch_id');

      issues.push({
        borrowApplicationId: dup.borrow_application_id,
        count: dup.count,
        receipts: receipts,
      });
    }

    return {
      checkType: 'duplicate_imports',
      passed: issues.length === 0,
      issuesFound: issues.length,
      details: { issues },
    };
  }

  async checkPermissionConsistency(): Promise<CheckResult> {
    const issues: any[] = [];

    const auditLogs = await db('audit_logs')
      .orderBy('created_at', 'desc')
      .limit(1000);

    for (const log of auditLogs) {
      if (!log.new_state) continue;

      const newState = JSON.parse(log.new_state);
      const previousState = log.previous_state
        ? JSON.parse(log.previous_state)
        : null;

      if (
        previousState?.status &&
        newState.status &&
        previousState.status !== newState.status
      ) {
        const canTransition = stateMachine.canTransition(
          previousState.status,
          newState.status,
          Role.ADMIN
        );

        if (!canTransition) {
          issues.push({
            auditLogId: log.id,
            receiptId: log.receipt_id,
            fromStatus: previousState.status,
            toStatus: newState.status,
            operator: log.operator_name,
            createdAt: log.created_at,
          });
        }
      }
    }

    return {
      checkType: 'permission_consistency',
      passed: issues.length === 0,
      issuesFound: issues.length,
      details: { issues },
    };
  }

  async checkExceptionRetention(): Promise<CheckResult> {
    const issues: any[] = [];

    const pendingReceipts = await db('exception_receipts')
      .where('status', ExceptionStatus.PENDING_REVIEW)
      .andWhere('is_deleted', false)
      .andWhere(
        'created_at',
        '<',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      )
      .select('id', 'receipt_no', 'reader_name', 'book_title', 'created_at');

    if (pendingReceipts.length > 0) {
      issues.push({
        type: 'long_pending_reviews',
        count: pendingReceipts.length,
        description: 'Receipts pending review for more than 30 days',
        receipts: pendingReceipts.slice(0, 50),
      });
    }

    const frozenReceipts = await db('exception_receipts')
      .where('status', ExceptionStatus.FROZEN)
      .andWhere('is_deleted', false)
      .andWhere(
        'frozen_at',
        '<',
        new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
      )
      .select(
        'id',
        'receipt_no',
        'reader_name',
        'book_title',
        'frozen_at',
        'frozen_reason'
      );

    if (frozenReceipts.length > 0) {
      issues.push({
        type: 'long_frozen',
        count: frozenReceipts.length,
        description: 'Receipts frozen for more than 60 days',
        receipts: frozenReceipts.slice(0, 50),
      });
    }

    return {
      checkType: 'exception_retention',
      passed: issues.length === 0,
      issuesFound: issues.reduce((sum, i) => sum + i.count, 0),
      details: { issues },
    };
  }

  async checkExportConsistency(): Promise<CheckResult> {
    const issues: any[] = [];

    const dbCount = await db('exception_receipts')
      .where('is_deleted', false)
      .count('* as count')
      .first();

    const auditCreateCount = await db('audit_logs')
      .where('action_type', 'batch_create')
      .sum(
        db.raw(
          "CASE WHEN new_state LIKE '%successCount%' THEN JSON_EXTRACT(new_state, '$.successCount') ELSE 0 END"
        ) + ' as total'
      )
      .first();

    const dbNum = parseInt(String(dbCount?.count || '0'));
    const auditNum = parseInt(String(auditCreateCount?.total || '0'));

    if (dbNum !== auditNum) {
      issues.push({
        type: 'count_mismatch',
        dbCount: dbNum,
        auditCount: auditNum,
        difference: dbNum - auditNum,
      });
    }

    const amountSum = await db('exception_receipts')
      .where('is_deleted', false)
      .sum('amount as total')
      .first();

    return {
      checkType: 'export_consistency',
      passed: issues.length === 0,
      issuesFound: issues.length,
      details: {
        issues,
        totals: {
          receiptCount: dbNum,
          totalAmount: parseFloat(amountSum?.total || '0'),
        },
      },
    };
  }

  async checkAuditLogIntegrity(): Promise<CheckResult> {
    const issues: any[] = [];

    const receipts = await db('exception_receipts')
      .limit(100)
      .select('id', 'receipt_no', 'status');

    for (const receipt of receipts) {
      const logs = await db('audit_logs')
        .where('receipt_id', receipt.id)
        .orderBy('created_at', 'asc');

      if (logs.length === 0) {
        issues.push({
          receiptId: receipt.id,
          receiptNo: receipt.receipt_no,
          issue: 'No audit logs found',
        });
        continue;
      }

      let currentStatus: string | null = null;
      for (const log of logs) {
        if (!log.new_state) continue;

        const newState = JSON.parse(log.new_state);
        if (newState.status) {
          currentStatus = newState.status;
        }
      }

      if (currentStatus && currentStatus !== receipt.status) {
        issues.push({
          receiptId: receipt.id,
          receiptNo: receipt.receipt_no,
          dbStatus: receipt.status,
          auditStatus: currentStatus,
          issue: 'Status mismatch between DB and audit log',
        });
      }
    }

    return {
      checkType: 'audit_log_integrity',
      passed: issues.length === 0,
      issuesFound: issues.length,
      details: { issues, checkedReceipts: receipts.length },
    };
  }

  async getLatestCheckResults(limit: number = 10): Promise<any[]> {
    const results = await db('auto_check_results')
      .orderBy('checked_at', 'desc')
      .limit(limit);

    return results.map((r: any) => ({
      id: r.id,
      checkType: r.check_type,
      passed: r.passed ? 1 === r.passed : r.passed,
      issuesFound: r.issues_found,
      details: r.details ? JSON.parse(r.details) : null,
      checkedAt: new Date(r.checked_at),
    }));
  }
}

export const autoCheckService = new AutoCheckService();
