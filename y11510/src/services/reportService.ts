import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { Parser } from 'json2csv';
import db from '../db';
import { ExceptionReceipt, ExceptionStatus, ExceptionType } from '../types';
import { config } from '../config';
import logger from '../utils/logger';

interface SummaryReport {
  totalReceipts: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  totalAmount: number;
  frozenCount: number;
  frozenAmount: number;
  pendingReviewCount: number;
  pendingReviewAmount: number;
  approvedCount: number;
  approvedAmount: number;
}

interface ExportOptions {
  status?: ExceptionStatus;
  exceptionType?: ExceptionType;
  startDate?: Date;
  endDate?: Date;
  includeDetails?: boolean;
}

export class ReportService {
  constructor() {
    this.ensureExportDir();
  }

  private ensureExportDir(): void {
    if (!fs.existsSync(config.export.dir)) {
      fs.mkdirSync(config.export.dir, { recursive: true });
    }
  }

  async getSummaryReport(): Promise<SummaryReport> {
    const receipts = await db('exception_receipts').where('is_deleted', false);

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalAmount = 0;
    let frozenCount = 0;
    let frozenAmount = 0;
    let pendingReviewCount = 0;
    let pendingReviewAmount = 0;
    let approvedCount = 0;
    let approvedAmount = 0;

    for (const receipt of receipts) {
      byStatus[receipt.status] = (byStatus[receipt.status] || 0) + 1;
      byType[receipt.exception_type] = (byType[receipt.exception_type] || 0) + 1;
      totalAmount += parseFloat(receipt.amount);

      if (receipt.status === ExceptionStatus.FROZEN) {
        frozenCount++;
        frozenAmount += parseFloat(receipt.amount);
      }
      if (receipt.status === ExceptionStatus.PENDING_REVIEW) {
        pendingReviewCount++;
        pendingReviewAmount += parseFloat(receipt.amount);
      }
      if (receipt.status === ExceptionStatus.APPROVED) {
        approvedCount++;
        approvedAmount += parseFloat(receipt.amount);
      }
    }

    return {
      totalReceipts: receipts.length,
      byStatus,
      byType,
      totalAmount,
      frozenCount,
      frozenAmount,
      pendingReviewCount,
      pendingReviewAmount,
      approvedCount,
      approvedAmount,
    };
  }

  async exportToCSV(options: ExportOptions = {}): Promise<string> {
    let query = db('exception_receipts')
      .select(
        'receipt_no',
        'exception_type',
        'status',
        'reader_id',
        'reader_name',
        'book_title',
        'amount',
        'reason',
        'manual_reason',
        'review_comment',
        'status_before_freeze',
        'frozen_reason',
        'created_at',
        'created_by',
        'batch_id'
      )
      .where('is_deleted', false);

    if (options.status) {
      query = query.andWhere('status', options.status);
    }
    if (options.exceptionType) {
      query = query.andWhere('exception_type', options.exceptionType);
    }
    if (options.startDate) {
      query = query.andWhere('created_at', '>=', options.startDate);
    }
    if (options.endDate) {
      query = query.andWhere('created_at', '<=', options.endDate);
    }

    const records = await query.orderBy('created_at', 'desc');

    const formattedRecords = records.map((r: any) => ({
      回执编号: r.receipt_no,
      异常类型: this.translateExceptionType(r.exception_type),
      状态: this.translateStatus(r.status),
      读者ID: r.reader_id,
      读者姓名: r.reader_name,
      图书名称: r.book_title,
      金额: r.amount,
      异常原因: r.reason,
      人工说明: r.manual_reason || '',
      审核意见: r.review_comment || '',
      冻结前状态: r.status_before_freeze ? this.translateStatus(r.status_before_freeze) : '',
      冻结原因: r.frozen_reason || '',
      创建时间: r.created_at,
      创建人: r.created_by,
      批次ID: r.batch_id,
    }));

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(formattedRecords);

    const exportId = uuidv4();
    const fileName = `exception_report_${exportId}.csv`;
    const filePath = path.join(config.export.dir, fileName);

    fs.writeFileSync(filePath, '\uFEFF' + csv, 'utf8');

    logger.info('Report exported to CSV', { filePath, recordCount: records.length });

    return filePath;
  }

  async getDetailedReceipt(receiptId: string): Promise<any> {
    const receiptRow = await db('exception_receipts')
      .where('id', receiptId)
      .andWhere('is_deleted', false)
      .first();

    if (!receiptRow) return null;

    const borrowApp = await db('borrow_applications')
      .where('id', receiptRow.borrow_application_id)
      .first();

    const expressOrder = receiptRow.express_order_id
      ? await db('express_orders').where('id', receiptRow.express_order_id).first()
      : null;

    const compensation = receiptRow.reader_compensation_id
      ? await db('reader_compensations')
          .where('id', receiptRow.reader_compensation_id)
          .first()
      : null;

    const attachments = await db('attachments')
      .where('receipt_id', receiptId)
      .select('id', 'file_name', 'file_type', 'file_size', 'created_at');

    const auditLogs = await db('audit_logs')
      .where('receipt_id', receiptId)
      .orderBy('created_at', 'desc')
      .limit(50);

    return {
      receipt: {
        id: receiptRow.id,
        receiptNo: receiptRow.receipt_no,
        exceptionType: receiptRow.exception_type,
        status: receiptRow.status,
        statusBeforeFreeze: receiptRow.status_before_freeze,
        amount: parseFloat(receiptRow.amount),
        reason: receiptRow.reason,
        manualReason: receiptRow.manual_reason,
        reviewComment: receiptRow.review_comment,
        frozenReason: receiptRow.frozen_reason,
        createdAt: receiptRow.created_at,
        createdBy: receiptRow.created_by,
      },
      borrowApplication: borrowApp
        ? {
            id: borrowApp.id,
            applicationNo: borrowApp.application_no,
            readerId: borrowApp.reader_id,
            readerName: borrowApp.reader_name,
            bookTitle: borrowApp.book_title,
            sourceLibrary: borrowApp.source_library,
            targetLibrary: borrowApp.target_library,
            applyDate: borrowApp.apply_date,
            dueDate: borrowApp.due_date,
          }
        : null,
      expressOrder: expressOrder
        ? {
            id: expressOrder.id,
            orderNo: expressOrder.order_no,
            courierCompany: expressOrder.courier_company,
            trackingNo: expressOrder.tracking_no,
            cost: parseFloat(expressOrder.cost),
            status: expressOrder.status,
          }
        : null,
      readerCompensation: compensation
        ? {
            id: compensation.id,
            recordNo: compensation.record_no,
            compensationType: compensation.compensation_type,
            amount: parseFloat(compensation.amount),
            reason: compensation.reason,
            status: compensation.status,
          }
        : null,
      attachments: attachments.map((a: any) => ({
        id: a.id,
        fileName: a.file_name,
        fileType: a.file_type,
        fileSize: a.file_size,
        createdAt: a.created_at,
      })),
      history: auditLogs.map((log: any) => ({
        actionType: log.action_type,
        operatorName: log.operator_name,
        changes: log.changes ? JSON.parse(log.changes) : null,
        reason: log.reason,
        createdAt: log.created_at,
      })),
    };
  }

  private translateStatus(status: string): string {
    const statusMap: Record<string, string> = {
      [ExceptionStatus.PENDING_REVIEW]: '待审核',
      [ExceptionStatus.APPROVED]: '已通过',
      [ExceptionStatus.REJECTED]: '已拒绝',
      [ExceptionStatus.FROZEN]: '已冻结',
      [ExceptionStatus.SETTLED]: '已结算',
      [ExceptionStatus.ARCHIVED]: '已归档',
      [ExceptionStatus.CANCELLED]: '已撤销',
    };
    return statusMap[status] || status;
  }

  private translateExceptionType(type: string): string {
    const typeMap: Record<string, string> = {
      [ExceptionType.OVERDUE]: '逾期',
      [ExceptionType.DAMAGED]: '污损',
      [ExceptionType.LOST]: '丢失',
      [ExceptionType.RENEW_OVERLAP]: '续借叠加',
      [ExceptionType.OTHER]: '其他',
    };
    return typeMap[type] || type;
  }

  async verifyConsistency(receiptId: string): Promise<{
    consistent: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    const receipt = await db('exception_receipts')
      .where('id', receiptId)
      .first();

    if (!receipt) {
      return { consistent: false, issues: ['Receipt not found'] };
    }

    const auditLogs = await db('audit_logs')
      .where('receipt_id', receiptId)
      .orderBy('created_at', 'desc');

    if (auditLogs.length === 0) {
      issues.push('No audit logs found');
    } else {
      const lastLog = auditLogs[0];
      const newState = lastLog.new_state ? JSON.parse(lastLog.new_state) : null;
      
      if (newState && newState.status !== receipt.status) {
        issues.push(
          `Status mismatch: DB=${receipt.status}, Last Audit=${newState.status}`
        );
      }
    }

    return {
      consistent: issues.length === 0,
      issues,
    };
  }
}

export const reportService = new ReportService();
