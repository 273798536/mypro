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
    let query = db('exception_receipts as er')
      .leftJoin('borrow_applications as ba', 'er.borrow_application_id', 'ba.id')
      .leftJoin('express_orders as eo', 'er.express_order_id', 'eo.id')
      .leftJoin('reader_compensations as rc', 'er.reader_compensation_id', 'rc.id')
      .leftJoin('supplier_bills as sb', 'er.supplier_bill_id', 'sb.id')
      .select(
        'er.id as receipt_id',
        'er.receipt_no',
        'er.exception_type',
        'er.status',
        'er.status_before_freeze',
        'er.previous_status',
        'er.reader_id',
        'er.reader_name',
        'er.book_title',
        'er.amount',
        'er.reason',
        'er.manual_reason',
        'er.review_comment',
        'er.reviewed_by',
        'er.reviewed_at',
        'er.frozen_reason',
        'er.frozen_by',
        'er.frozen_at',
        'er.created_at as receipt_created_at',
        'er.created_by',
        'er.batch_id',
        'ba.id as borrow_application_id',
        'ba.application_no',
        'ba.source_library',
        'ba.target_library',
        'ba.apply_date',
        'ba.borrow_date',
        'ba.due_date',
        'ba.return_date',
        'ba.status as borrow_status',
        'eo.id as express_order_id',
        'eo.order_no',
        'eo.courier_company',
        'eo.tracking_no',
        'eo.sender',
        'eo.receiver',
        'eo.cost as express_cost',
        'eo.status as express_status',
        'rc.id as compensation_id',
        'rc.record_no',
        'rc.compensation_type',
        'rc.amount as compensation_amount',
        'rc.reason as compensation_reason',
        'rc.status as compensation_status',
        'rc.paid_date',
        'sb.id as supplier_bill_id',
        'sb.bill_no',
        'sb.supplier_name',
        'sb.total_amount as bill_total_amount',
        'sb.bill_date',
        'sb.due_date as bill_due_date',
        'sb.status as bill_status'
      )
      .where('er.is_deleted', false);

    if (options.status) {
      query = query.andWhere('er.status', options.status);
    }
    if (options.exceptionType) {
      query = query.andWhere('er.exception_type', options.exceptionType);
    }
    if (options.startDate) {
      query = query.andWhere('er.created_at', '>=', options.startDate);
    }
    if (options.endDate) {
      query = query.andWhere('er.created_at', '<=', options.endDate);
    }

    const records = await query.orderBy('er.created_at', 'desc');

    const formattedRecords = records.map((r: any) => ({
      回执ID: r.receipt_id,
      回执编号: r.receipt_no,
      异常类型: this.translateExceptionType(r.exception_type),
      当前状态: this.translateStatus(r.status),
      冻结前状态: r.status_before_freeze ? this.translateStatus(r.status_before_freeze) : '',
      上一状态: r.previous_status ? this.translateStatus(r.previous_status) : '',
      读者ID: r.reader_id,
      读者姓名: r.reader_name,
      图书名称: r.book_title,
      异常金额: r.amount,
      异常原因: r.reason,
      人工说明: r.manual_reason || '',
      审核意见: r.review_comment || '',
      审核人: r.reviewed_by || '',
      审核时间: r.reviewed_at || '',
      冻结原因: r.frozen_reason || '',
      冻结人: r.frozen_by || '',
      冻结时间: r.frozen_at || '',
      创建时间: r.receipt_created_at,
      创建人: r.created_by,
      批次ID: r.batch_id,
      借阅申请ID: r.borrow_application_id || '',
      申请编号: r.application_no || '',
      来源馆: r.source_library || '',
      目标馆: r.target_library || '',
      申请日期: r.apply_date || '',
      借阅日期: r.borrow_date || '',
      应还日期: r.due_date || '',
      归还日期: r.return_date || '',
      借阅状态: r.borrow_status || '',
      快递单ID: r.express_order_id || '',
      快递单号: r.order_no || '',
      快递公司: r.courier_company || '',
      跟踪号: r.tracking_no || '',
      发件人: r.sender || '',
      收件人: r.receiver || '',
      快递费用: r.express_cost || '',
      快递状态: r.express_status || '',
      赔偿记录ID: r.compensation_id || '',
      赔偿编号: r.record_no || '',
      赔偿类型: r.compensation_type || '',
      赔偿金额: r.compensation_amount || '',
      赔偿原因: r.compensation_reason || '',
      赔偿状态: r.compensation_status || '',
      赔偿支付日期: r.paid_date || '',
      供应商账单ID: r.supplier_bill_id || '',
      账单编号: r.bill_no || '',
      供应商名称: r.supplier_name || '',
      账单总金额: r.bill_total_amount || '',
      账单日期: r.bill_date || '',
      账单到期日: r.bill_due_date || '',
      账单状态: r.bill_status || '',
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

    const supplierBill = receiptRow.supplier_bill_id
      ? await db('supplier_bills').where('id', receiptRow.supplier_bill_id).first()
      : null;

    const attachments = await db('attachments')
      .where('receipt_id', receiptId)
      .select('id', 'file_name', 'file_type', 'file_size', 'created_at');

    const approvalEmails = await db('approval_emails')
      .where('receipt_id', receiptId)
      .orderBy('sent_at', 'desc');

    const auditLogs = await db('audit_logs')
      .where('receipt_id', receiptId)
      .orderBy('created_at', 'desc')
      .limit(50);

    return {
      receipt: {
        id: receiptRow.id,
        receiptNo: receiptRow.receipt_no,
        batchId: receiptRow.batch_id,
        exceptionType: receiptRow.exception_type,
        status: receiptRow.status,
        statusBeforeFreeze: receiptRow.status_before_freeze,
        previousStatus: receiptRow.previous_status,
        readerId: receiptRow.reader_id,
        readerName: receiptRow.reader_name,
        bookTitle: receiptRow.book_title,
        amount: parseFloat(receiptRow.amount),
        reason: receiptRow.reason,
        manualReason: receiptRow.manual_reason,
        reviewComment: receiptRow.review_comment,
        reviewedBy: receiptRow.reviewed_by,
        reviewedAt: receiptRow.reviewed_at,
        frozenBy: receiptRow.frozen_by,
        frozenAt: receiptRow.frozen_at,
        frozenReason: receiptRow.frozen_reason,
        borrowApplicationId: receiptRow.borrow_application_id,
        expressOrderId: receiptRow.express_order_id,
        readerCompensationId: receiptRow.reader_compensation_id,
        supplierBillId: receiptRow.supplier_bill_id,
        createdAt: receiptRow.created_at,
        updatedAt: receiptRow.updated_at,
        createdBy: receiptRow.created_by,
      },
      borrowApplication: borrowApp
        ? {
            id: borrowApp.id,
            applicationNo: borrowApp.application_no,
            readerId: borrowApp.reader_id,
            readerName: borrowApp.reader_name,
            bookId: borrowApp.book_id,
            bookTitle: borrowApp.book_title,
            sourceLibrary: borrowApp.source_library,
            targetLibrary: borrowApp.target_library,
            applyDate: borrowApp.apply_date,
            borrowDate: borrowApp.borrow_date,
            dueDate: borrowApp.due_date,
            returnDate: borrowApp.return_date,
            status: borrowApp.status,
          }
        : null,
      expressOrder: expressOrder
        ? {
            id: expressOrder.id,
            orderNo: expressOrder.order_no,
            borrowApplicationId: expressOrder.borrow_application_id,
            courierCompany: expressOrder.courier_company,
            trackingNo: expressOrder.tracking_no,
            sender: expressOrder.sender,
            receiver: expressOrder.receiver,
            sendDate: expressOrder.send_date,
            receiveDate: expressOrder.receive_date,
            cost: parseFloat(expressOrder.cost),
            status: expressOrder.status,
          }
        : null,
      readerCompensation: compensation
        ? {
            id: compensation.id,
            recordNo: compensation.record_no,
            borrowApplicationId: compensation.borrow_application_id,
            readerId: compensation.reader_id,
            readerName: compensation.reader_name,
            compensationType: compensation.compensation_type,
            amount: parseFloat(compensation.amount),
            reason: compensation.reason,
            status: compensation.status,
            paidDate: compensation.paid_date,
          }
        : null,
      supplierBill: supplierBill
        ? {
            id: supplierBill.id,
            billNo: supplierBill.bill_no,
            supplierId: supplierBill.supplier_id,
            supplierName: supplierBill.supplier_name,
            borrowApplicationIds: supplierBill.borrow_application_ids
              ? JSON.parse(supplierBill.borrow_application_ids)
              : [],
            totalAmount: parseFloat(supplierBill.total_amount),
            billDate: supplierBill.bill_date,
            dueDate: supplierBill.due_date,
            status: supplierBill.status,
            paidDate: supplierBill.paid_date,
          }
        : null,
      attachments: attachments.map((a: any) => ({
        id: a.id,
        fileName: a.file_name,
        fileType: a.file_type,
        fileSize: a.file_size,
        createdAt: a.created_at,
      })),
      approvalEmails: approvalEmails.map((e: any) => ({
        id: e.id,
        emailSubject: e.email_subject,
        emailFrom: e.email_from,
        emailTo: e.email_to ? JSON.parse(e.email_to) : [],
        emailCc: e.email_cc ? JSON.parse(e.email_cc) : undefined,
        emailBody: e.email_body,
        sentAt: e.sent_at,
        sentBy: e.sent_by,
        createdAt: e.created_at,
      })),
      history: auditLogs.map((log: any) => ({
        id: log.id,
        actionType: log.action_type,
        operatorId: log.operator_id,
        operatorName: log.operator_name,
        previousState: log.previous_state ? JSON.parse(log.previous_state) : null,
        newState: log.new_state ? JSON.parse(log.new_state) : null,
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
