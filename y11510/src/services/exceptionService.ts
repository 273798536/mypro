import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import {
  ExceptionReceipt,
  ExceptionStatus,
  ExceptionType,
  RecordType,
  Role,
  ActionType,
  Batch,
  FailedRecord,
  BorrowApplication,
  ExpressOrder,
  ReaderCompensation,
  SupplierBill,
} from '../types';
import { stateMachine } from './stateMachine';
import { auditService } from './auditService';
import logger from '../utils/logger';
import { config } from '../config';

interface CreateReceiptParams {
  borrowApplicationId: string;
  expressOrderId?: string;
  readerCompensationId?: string;
  supplierBillId?: string;
  exceptionType: ExceptionType;
  amount: number;
  reason: string;
  readerId: string;
  readerName: string;
  bookTitle: string;
  createdBy: string;
  batchId: string;
}

interface BatchCreateResult {
  batchId: string;
  batchNo: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
  failedRecords: FailedRecord[];
  receiptIds: string[];
}

export class ExceptionService {
  private generateReceiptNo(): string {
    const date = new Date();
    const prefix = `ER${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `${prefix}${random}`;
  }

  private generateBatchNo(): string {
    const date = new Date();
    const prefix = `BATCH${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `${prefix}${random}`;
  }

  async createReceipt(params: CreateReceiptParams): Promise<string> {
    const id = uuidv4();
    const now = new Date();
    const receiptNo = this.generateReceiptNo();

    const receipt: ExceptionReceipt = {
      id,
      receiptNo,
      batchId: params.batchId,
      exceptionType: params.exceptionType,
      status: ExceptionStatus.PENDING_REVIEW,
      borrowApplicationId: params.borrowApplicationId,
      expressOrderId: params.expressOrderId,
      readerCompensationId: params.readerCompensationId,
      supplierBillId: params.supplierBillId,
      readerId: params.readerId,
      readerName: params.readerName,
      bookTitle: params.bookTitle,
      amount: params.amount,
      reason: params.reason,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      createdBy: params.createdBy,
    };

    await db('exception_receipts').insert(this.serializeReceipt(receipt));

    await auditService.createLog({
      receiptId: id,
      actionType: ActionType.BATCH_CREATE,
      operatorId: params.createdBy,
      operatorName: params.createdBy,
      newState: receipt as unknown as Record<string, unknown>,
      reason: 'Create exception receipt',
    });

    logger.info('Exception receipt created', { id, receiptNo });
    return id;
  }

  async batchCreate(
    records: Array<{
      borrowApplication: BorrowApplication;
      expressOrder?: ExpressOrder;
      readerCompensation?: ReaderCompensation;
      supplierBill?: SupplierBill;
      exceptionType: ExceptionType;
      amount: number;
      reason: string;
    }>,
    createdBy: string,
    operatorName: string,
    batchName?: string
  ): Promise<BatchCreateResult> {
    const batchId = uuidv4();
    const batchNo = this.generateBatchNo();
    const failedRecords: FailedRecord[] = [];
    const receiptIds: string[] = [];

    if (records.length > config.batch.maxSize) {
      throw new Error(
        `Batch size exceeds maximum allowed size of ${config.batch.maxSize}`
      );
    }

    await db('batches').insert({
      id: batchId,
      batch_no: batchNo,
      name: batchName || `Batch ${batchNo}`,
      record_type: RecordType.BORROW_APPLICATION,
      total_count: records.length,
      success_count: 0,
      failed_count: 0,
      failed_records: '[]',
      status: 'processing',
      created_by: createdBy,
      created_at: new Date(),
    });

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        const existing = await db('exception_receipts')
          .where('borrow_application_id', record.borrowApplication.id)
          .andWhere('is_deleted', false)
          .first();

        if (existing) {
          failedRecords.push({
            rowIndex: i,
            recordData: record as unknown as Record<string, unknown>,
            errors: ['Duplicate borrow application'],
          });
          continue;
        }

        const now = new Date();
        const borrowApp = {
          ...record.borrowApplication,
          createdAt: record.borrowApplication.createdAt || now,
          updatedAt: record.borrowApplication.updatedAt || now,
        };

        const existingBorrowApp = await db('borrow_applications')
          .where('id', borrowApp.id)
          .first();
        if (!existingBorrowApp) {
          await db('borrow_applications').insert(this.serializeBorrowApplication(borrowApp));
        }

        let expressOrderId: string | undefined;
        if (record.expressOrder) {
          const expressOrder = {
            ...record.expressOrder,
            borrowApplicationId: borrowApp.id,
            createdAt: record.expressOrder.createdAt || now,
            updatedAt: record.expressOrder.updatedAt || now,
          };
          const existingExpress = await db('express_orders')
            .where('id', expressOrder.id)
            .first();
          if (!existingExpress) {
            await db('express_orders').insert(this.serializeExpressOrder(expressOrder));
          }
          expressOrderId = expressOrder.id;
        }

        let readerCompensationId: string | undefined;
        if (record.readerCompensation) {
          const compensation = {
            ...record.readerCompensation,
            borrowApplicationId: borrowApp.id,
            createdAt: record.readerCompensation.createdAt || now,
            updatedAt: record.readerCompensation.updatedAt || now,
          };
          const existingComp = await db('reader_compensations')
            .where('id', compensation.id)
            .first();
          if (!existingComp) {
            await db('reader_compensations').insert(this.serializeReaderCompensation(compensation));
          }
          readerCompensationId = compensation.id;
        }

        let supplierBillId: string | undefined;
        if (record.supplierBill) {
          const supplierBill = {
            ...record.supplierBill,
            createdAt: record.supplierBill.createdAt || now,
            updatedAt: record.supplierBill.updatedAt || now,
          };
          const existingBill = await db('supplier_bills')
            .where('id', supplierBill.id)
            .first();
          if (!existingBill) {
            await db('supplier_bills').insert(this.serializeSupplierBill(supplierBill));
          }
          supplierBillId = supplierBill.id;
        }

        const receiptId = await this.createReceipt({
          borrowApplicationId: borrowApp.id,
          expressOrderId,
          readerCompensationId,
          supplierBillId,
          exceptionType: record.exceptionType,
          amount: record.amount,
          reason: record.reason,
          readerId: borrowApp.readerId,
          readerName: borrowApp.readerName,
          bookTitle: borrowApp.bookTitle,
          createdBy,
          batchId,
        });

        receiptIds.push(receiptId);
      } catch (error) {
        failedRecords.push({
          rowIndex: i,
          recordData: record as unknown as Record<string, unknown>,
          errors: [(error as Error).message],
        });
      }
    }

    await db('batches')
      .where('id', batchId)
      .update({
        success_count: receiptIds.length,
        failed_count: failedRecords.length,
        failed_records: JSON.stringify(failedRecords),
        status: 'completed',
        completed_at: new Date(),
      });

    await auditService.createLog({
      batchId,
      actionType: ActionType.BATCH_CREATE,
      operatorId: createdBy,
      operatorName,
      newState: {
        batchId,
        totalCount: records.length,
        successCount: receiptIds.length,
        failedCount: failedRecords.length,
      },
    });

    return {
      batchId,
      batchNo,
      totalCount: records.length,
      successCount: receiptIds.length,
      failedCount: failedRecords.length,
      failedRecords,
      receiptIds,
    };
  }

  async getReceiptById(id: string): Promise<ExceptionReceipt | null> {
    const row = await db('exception_receipts')
      .where('id', id)
      .andWhere('is_deleted', false)
      .first();

    return row ? this.deserializeReceipt(row) : null;
  }

  async getReceiptByNo(receiptNo: string): Promise<ExceptionReceipt | null> {
    const row = await db('exception_receipts')
      .where('receipt_no', receiptNo)
      .andWhere('is_deleted', false)
      .first();

    return row ? this.deserializeReceipt(row) : null;
  }

  async reviewDecision(
    receiptId: string,
    approved: boolean,
    reviewComment: string,
    reviewedBy: string,
    reviewerName: string,
    role: Role
  ): Promise<boolean> {
    const receipt = await this.getReceiptById(receiptId);
    if (!receipt) {
      throw new Error('Receipt not found');
    }

    const targetStatus = approved
      ? ExceptionStatus.APPROVED
      : ExceptionStatus.REJECTED;

    if (!stateMachine.canTransition(receipt.status, targetStatus, role)) {
      throw new Error(
        `Cannot transition from ${receipt.status} to ${targetStatus} for role ${role}`
      );
    }

    const previousState = { ...receipt };
    const now = new Date();

    await db('exception_receipts')
      .where('id', receiptId)
      .update({
        status: targetStatus,
        previous_status: receipt.status,
        review_comment: reviewComment,
        reviewed_by: reviewedBy,
        reviewed_at: now,
        updated_at: now,
      });

    const updatedReceipt = await this.getReceiptById(receiptId);

    await auditService.createLog({
      receiptId,
      actionType: ActionType.REVIEW_DECISION,
      operatorId: reviewedBy,
      operatorName: reviewerName,
      previousState: previousState as unknown as Record<string, unknown>,
      newState: updatedReceipt as unknown as Record<string, unknown>,
      reason: reviewComment,
    });

    logger.info('Review decision completed', {
      receiptId,
      decision: approved ? 'approved' : 'rejected',
    });

    return true;
  }

  async freezeSettlement(
    receiptId: string,
    frozenReason: string,
    frozenBy: string,
    freezerName: string,
    role: Role
  ): Promise<boolean> {
    const receipt = await this.getReceiptById(receiptId);
    if (!receipt) {
      throw new Error('Receipt not found');
    }

    if (!stateMachine.canFreeze(receipt.status, role)) {
      throw new Error(`Cannot freeze receipt with status ${receipt.status}`);
    }

    const previousState = { ...receipt };
    const now = new Date();

    await db('exception_receipts')
      .where('id', receiptId)
      .update({
        status: ExceptionStatus.FROZEN,
        status_before_freeze: receipt.status,
        previous_status: receipt.status,
        frozen_reason: frozenReason,
        frozen_by: frozenBy,
        frozen_at: now,
        updated_at: now,
      });

    const updatedReceipt = await this.getReceiptById(receiptId);

    await auditService.createLog({
      receiptId,
      actionType: ActionType.FREEZE_SETTLEMENT,
      operatorId: frozenBy,
      operatorName: freezerName,
      previousState: previousState as unknown as Record<string, unknown>,
      newState: updatedReceipt as unknown as Record<string, unknown>,
      reason: frozenReason,
    });

    logger.info('Receipt frozen', { receiptId });
    return true;
  }

  async unfreeze(
    receiptId: string,
    targetStatus: ExceptionStatus,
    reason: string,
    unfrozenBy: string,
    unfreezerName: string,
    role: Role
  ): Promise<boolean> {
    const receipt = await this.getReceiptById(receiptId);
    if (!receipt) {
      throw new Error('Receipt not found');
    }

    if (!stateMachine.canUnfreeze(receipt.status, role)) {
      throw new Error(`Cannot unfreeze receipt with status ${receipt.status}`);
    }

    if (!stateMachine.canTransition(ExceptionStatus.FROZEN, targetStatus, role)) {
      throw new Error(
        `Cannot transition from frozen to ${targetStatus} for role ${role}`
      );
    }

    const previousState = { ...receipt };
    const now = new Date();

    await db('exception_receipts')
      .where('id', receiptId)
      .update({
        status: targetStatus,
        previous_status: ExceptionStatus.FROZEN,
        updated_at: now,
      });

    const updatedReceipt = await this.getReceiptById(receiptId);

    await auditService.createLog({
      receiptId,
      actionType: ActionType.UNFREEZE,
      operatorId: unfrozenBy,
      operatorName: unfreezerName,
      previousState: previousState as unknown as Record<string, unknown>,
      newState: updatedReceipt as unknown as Record<string, unknown>,
      reason,
    });

    logger.info('Receipt unfrozen', { receiptId, targetStatus });
    return true;
  }

  async cancelAndArchive(
    receiptId: string,
    reason: string,
    cancelledBy: string,
    cancellerName: string,
    role: Role,
    archive: boolean = false
  ): Promise<boolean> {
    const receipt = await this.getReceiptById(receiptId);
    if (!receipt) {
      throw new Error('Receipt not found');
    }

    const targetStatus = archive
      ? ExceptionStatus.ARCHIVED
      : ExceptionStatus.CANCELLED;

    if (!stateMachine.canTransition(receipt.status, targetStatus, role)) {
      throw new Error(
        `Cannot transition from ${receipt.status} to ${targetStatus} for role ${role}`
      );
    }

    const previousState = { ...receipt };
    const now = new Date();

    await db('exception_receipts')
      .where('id', receiptId)
      .update({
        status: targetStatus,
        previous_status: receipt.status,
        updated_at: now,
      });

    const updatedReceipt = await this.getReceiptById(receiptId);

    await auditService.createLog({
      receiptId,
      actionType: ActionType.CANCEL_ARCHIVE,
      operatorId: cancelledBy,
      operatorName: cancellerName,
      previousState: previousState as unknown as Record<string, unknown>,
      newState: updatedReceipt as unknown as Record<string, unknown>,
      reason,
    });

    logger.info('Receipt cancelled/archived', { receiptId, targetStatus });
    return true;
  }

  async updateManualReason(
    receiptId: string,
    manualReason: string,
    updatedBy: string,
    updaterName: string,
    role: Role
  ): Promise<boolean> {
    const receipt = await this.getReceiptById(receiptId);
    if (!receipt) {
      throw new Error('Receipt not found');
    }

    if (!stateMachine.validateManualEdit(receipt.status, role)) {
      throw new Error(
        `Cannot edit receipt with status ${receipt.status} for role ${role}`
      );
    }

    const previousState = { ...receipt };
    const now = new Date();

    await db('exception_receipts')
      .where('id', receiptId)
      .update({
        manual_reason: manualReason,
        updated_at: now,
      });

    const updatedReceipt = await this.getReceiptById(receiptId);

    await auditService.createLog({
      receiptId,
      actionType: ActionType.MANUAL_EDIT,
      operatorId: updatedBy,
      operatorName: updaterName,
      previousState: previousState as unknown as Record<string, unknown>,
      newState: updatedReceipt as unknown as Record<string, unknown>,
      reason: 'Update manual reason',
    });

    return true;
  }

  async getBatchById(batchId: string): Promise<Batch | null> {
    const row = await db('batches').where('id', batchId).first();
    return row ? this.deserializeBatch(row) : null;
  }

  async getReceiptsByBatchId(
    batchId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<ExceptionReceipt[]> {
    const rows = await db('exception_receipts')
      .where('batch_id', batchId)
      .andWhere('is_deleted', false)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return rows.map(this.deserializeReceipt);
  }

  async getReceipts(filters?: {
    status?: ExceptionStatus;
    exceptionType?: ExceptionType;
    readerId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ receipts: ExceptionReceipt[]; total: number }> {
    let query = db('exception_receipts').where('is_deleted', false);

    if (filters?.status) {
      query = query.andWhere('status', filters.status);
    }
    if (filters?.exceptionType) {
      query = query.andWhere('exception_type', filters.exceptionType);
    }
    if (filters?.readerId) {
      query = query.andWhere('reader_id', filters.readerId);
    }
    if (filters?.startDate) {
      query = query.andWhere('created_at', '>=', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.andWhere('created_at', '<=', filters.endDate);
    }

    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');

    const rows = await query
      .orderBy('created_at', 'desc')
      .limit(filters?.limit || 100)
      .offset(filters?.offset || 0);

    return {
      receipts: rows.map(this.deserializeReceipt),
      total: count as number,
    };
  }

  private serializeBorrowApplication(app: BorrowApplication): Record<string, unknown> {
    return {
      id: app.id,
      application_no: app.applicationNo,
      reader_id: app.readerId,
      reader_name: app.readerName,
      book_id: app.bookId,
      book_title: app.bookTitle,
      source_library: app.sourceLibrary,
      target_library: app.targetLibrary,
      apply_date: app.applyDate,
      borrow_date: app.borrowDate,
      due_date: app.dueDate,
      return_date: app.returnDate,
      status: app.status,
      created_at: app.createdAt,
      updated_at: app.updatedAt,
    };
  }

  private serializeExpressOrder(order: ExpressOrder): Record<string, unknown> {
    return {
      id: order.id,
      order_no: order.orderNo,
      borrow_application_id: order.borrowApplicationId,
      courier_company: order.courierCompany,
      tracking_no: order.trackingNo,
      sender: order.sender,
      receiver: order.receiver,
      send_date: order.sendDate,
      receive_date: order.receiveDate,
      cost: order.cost,
      status: order.status,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
    };
  }

  private serializeReaderCompensation(comp: ReaderCompensation): Record<string, unknown> {
    return {
      id: comp.id,
      record_no: comp.recordNo,
      borrow_application_id: comp.borrowApplicationId,
      reader_id: comp.readerId,
      reader_name: comp.readerName,
      compensation_type: comp.compensationType,
      amount: comp.amount,
      reason: comp.reason,
      status: comp.status,
      paid_date: comp.paidDate,
      created_at: comp.createdAt,
      updated_at: comp.updatedAt,
    };
  }

  private serializeSupplierBill(bill: SupplierBill): Record<string, unknown> {
    return {
      id: bill.id,
      bill_no: bill.billNo,
      supplier_id: bill.supplierId,
      supplier_name: bill.supplierName,
      borrow_application_ids: JSON.stringify(bill.borrowApplicationIds),
      total_amount: bill.totalAmount,
      bill_date: bill.billDate,
      due_date: bill.dueDate,
      status: bill.status,
      paid_date: bill.paidDate,
      created_at: bill.createdAt,
      updated_at: bill.updatedAt,
    };
  }

  private serializeReceipt(receipt: ExceptionReceipt): Record<string, unknown> {
    return {
      id: receipt.id,
      receipt_no: receipt.receiptNo,
      batch_id: receipt.batchId,
      exception_type: receipt.exceptionType,
      status: receipt.status,
      borrow_application_id: receipt.borrowApplicationId,
      express_order_id: receipt.expressOrderId,
      reader_compensation_id: receipt.readerCompensationId,
      supplier_bill_id: receipt.supplierBillId,
      reader_id: receipt.readerId,
      reader_name: receipt.readerName,
      book_title: receipt.bookTitle,
      amount: receipt.amount,
      reason: receipt.reason,
      manual_reason: receipt.manualReason,
      review_comment: receipt.reviewComment,
      reviewed_by: receipt.reviewedBy,
      reviewed_at: receipt.reviewedAt,
      frozen_by: receipt.frozenBy,
      frozen_at: receipt.frozenAt,
      frozen_reason: receipt.frozenReason,
      previous_status: receipt.previousStatus,
      status_before_freeze: receipt.statusBeforeFreeze,
      is_deleted: receipt.isDeleted,
      created_at: receipt.createdAt,
      updated_at: receipt.updatedAt,
      created_by: receipt.createdBy,
    };
  }

  private deserializeReceipt(row: any): ExceptionReceipt {
    return {
      id: row.id,
      receiptNo: row.receipt_no,
      batchId: row.batch_id,
      exceptionType: row.exception_type,
      status: row.status,
      borrowApplicationId: row.borrow_application_id,
      expressOrderId: row.express_order_id,
      readerCompensationId: row.reader_compensation_id,
      supplierBillId: row.supplier_bill_id,
      readerId: row.reader_id,
      readerName: row.reader_name,
      bookTitle: row.book_title,
      amount: parseFloat(row.amount),
      reason: row.reason,
      manualReason: row.manual_reason,
      reviewComment: row.review_comment,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
      frozenBy: row.frozen_by,
      frozenAt: row.frozen_at ? new Date(row.frozen_at) : undefined,
      frozenReason: row.frozen_reason,
      previousStatus: row.previous_status,
      statusBeforeFreeze: row.status_before_freeze,
      isDeleted: row.is_deleted,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      createdBy: row.created_by,
    };
  }

  private deserializeBatch(row: any): Batch {
    return {
      id: row.id,
      batchNo: row.batch_no,
      name: row.name,
      recordType: row.record_type,
      totalCount: row.total_count,
      successCount: row.success_count,
      failedCount: row.failed_count,
      failedRecords: row.failed_records
        ? JSON.parse(row.failed_records)
        : [],
      status: row.status,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    };
  }
}

export const exceptionService = new ExceptionService();
