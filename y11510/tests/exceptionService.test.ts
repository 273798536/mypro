import { exceptionService } from '../src/services/exceptionService';
import { approvalEmailService } from '../src/services/approvalEmailService';
import { reportService } from '../src/services/reportService';
import { ExceptionStatus, ExceptionType, Role, BorrowApplication, ExpressOrder, ReaderCompensation, SupplierBill } from '../src/types';
import db from '../src/db';
import { v4 as uuidv4 } from 'uuid';

describe('ExceptionService', () => {
  const createTestBorrowApplication = (): BorrowApplication => ({
    id: uuidv4(),
    applicationNo: `APP${uuidv4().slice(0, 8)}`,
    readerId: 'R001',
    readerName: '张三',
    bookId: 'B001',
    bookTitle: '图书测试',
    sourceLibrary: '图书馆A',
    targetLibrary: '图书馆B',
    applyDate: new Date(),
    status: 'exception',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  describe('batchCreate', () => {
    it('should create receipts successfully', async () => {
      const borrowApp = createTestBorrowApplication();

      const result = await exceptionService.batchCreate(
        [
          {
            borrowApplication: borrowApp,
            exceptionType: ExceptionType.OVERDUE,
            amount: 50,
            reason: '逾期30天',
          },
        ],
        'user001',
        '管理员'
      );

      expect(result.totalCount).toBe(1);
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(result.receiptIds.length).toBe(1);

      const receipt = await exceptionService.getReceiptById(result.receiptIds[0]);
      expect(receipt).not.toBeNull();
      expect(receipt?.status).toBe(ExceptionStatus.PENDING_REVIEW);
      expect(receipt?.exceptionType).toBe(ExceptionType.OVERDUE);
      expect(receipt?.amount).toBe(50);
    });

    it('should detect duplicate borrow applications', async () => {
      const borrowApp = createTestBorrowApplication();

      await exceptionService.batchCreate(
        [
          {
            borrowApplication: borrowApp,
            exceptionType: ExceptionType.OVERDUE,
            amount: 50,
            reason: '逾期30天',
          },
        ],
        'user001',
        '管理员'
      );

      const result = await exceptionService.batchCreate(
        [
          {
            borrowApplication: borrowApp,
            exceptionType: ExceptionType.DAMAGED,
            amount: 100,
            reason: '图书污损',
          },
        ],
        'user001',
        '管理员'
      );

      expect(result.totalCount).toBe(1);
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.failedRecords[0].errors).toContain('Duplicate borrow application');
    });

    it('should handle mixed success and failure', async () => {
      const borrowApp1 = createTestBorrowApplication();
      const borrowApp2 = createTestBorrowApplication();

      await exceptionService.batchCreate(
        [
          {
            borrowApplication: borrowApp1,
            exceptionType: ExceptionType.OVERDUE,
            amount: 50,
            reason: '逾期30天',
          },
        ],
        'user001',
        '管理员'
      );

      const result = await exceptionService.batchCreate(
        [
          {
            borrowApplication: borrowApp1,
            exceptionType: ExceptionType.OVERDUE,
            amount: 50,
            reason: '逾期30天',
          },
          {
            borrowApplication: borrowApp2,
            exceptionType: ExceptionType.DAMAGED,
            amount: 100,
            reason: '图书污损',
          },
        ],
        'user001',
        '管理员'
      );

      expect(result.totalCount).toBe(2);
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(1);
    });
  });

  describe('reviewDecision', () => {
    it('should approve receipt', async () => {
      const borrowApp = createTestBorrowApplication();

      const batchResult = await exceptionService.batchCreate(
        [
          {
            borrowApplication: borrowApp,
            exceptionType: ExceptionType.OVERDUE,
            amount: 50,
            reason: '逾期30天',
          },
        ],
        'user001',
        '管理员'
      );

      const receiptId = batchResult.receiptIds[0];

      await exceptionService.reviewDecision(
        receiptId,
        true,
        '情况属实，予以通过',
        'reviewer001',
        '审核员',
        Role.REVIEWER
      );

      const receipt = await exceptionService.getReceiptById(receiptId);
      expect(receipt?.status).toBe(ExceptionStatus.APPROVED);
      expect(receipt?.reviewComment).toBe('情况属实，予以通过');
      expect(receipt?.reviewedBy).toBe('reviewer001');
    });

    it('should reject receipt', async () => {
      const borrowApp = createTestBorrowApplication();

      const batchResult = await exceptionService.batchCreate(
        [
          {
            borrowApplication: borrowApp,
            exceptionType: ExceptionType.OVERDUE,
            amount: 50,
            reason: '逾期30天',
          },
        ],
        'user001',
        '管理员'
      );

      const receiptId = batchResult.receiptIds[0];

      await exceptionService.reviewDecision(
        receiptId,
        false,
        '证据不足，予以驳回',
        'reviewer001',
        '审核员',
        Role.REVIEWER
      );

      const receipt = await exceptionService.getReceiptById(receiptId);
      expect(receipt?.status).toBe(ExceptionStatus.REJECTED);
    });

    it('should throw error for invalid role', async () => {
      const borrowApp = createTestBorrowApplication();

      const batchResult = await exceptionService.batchCreate(
        [
          {
            borrowApplication: borrowApp,
            exceptionType: ExceptionType.OVERDUE,
            amount: 50,
            reason: '逾期30天',
          },
        ],
        'user001',
        '管理员'
      );

      const receiptId = batchResult.receiptIds[0];

      await expect(
        exceptionService.reviewDecision(
          receiptId,
          true,
          '情况属实',
          'operator001',
          '操作员',
          Role.OPERATOR
        )
      ).rejects.toThrow();
    });
  });

  describe('freezeSettlement', () => {
    it('should freeze receipt', async () => {
      const borrowApp = createTestBorrowApplication();

      const batchResult = await exceptionService.batchCreate(
        [
          {
            borrowApplication: borrowApp,
            exceptionType: ExceptionType.OVERDUE,
            amount: 50,
            reason: '逾期30天',
          },
        ],
        'user001',
        '管理员'
      );

      const receiptId = batchResult.receiptIds[0];

      await exceptionService.freezeSettlement(
        receiptId,
        '存在争议，需要进一步核实',
        'admin001',
        '超级管理员',
        Role.ADMIN
      );

      const receipt = await exceptionService.getReceiptById(receiptId);
      expect(receipt?.status).toBe(ExceptionStatus.FROZEN);
      expect(receipt?.statusBeforeFreeze).toBe(ExceptionStatus.PENDING_REVIEW);
      expect(receipt?.frozenReason).toBe('存在争议，需要进一步核实');
    });

    it('should throw error for non-admin', async () => {
      const borrowApp = createTestBorrowApplication();

      const batchResult = await exceptionService.batchCreate(
        [
          {
            borrowApplication: borrowApp,
            exceptionType: ExceptionType.OVERDUE,
            amount: 50,
            reason: '逾期30天',
          },
        ],
        'user001',
        '管理员'
      );

      const receiptId = batchResult.receiptIds[0];

      await expect(
        exceptionService.freezeSettlement(
          receiptId,
          '存在争议',
          'reviewer001',
          '审核员',
          Role.REVIEWER
        )
      ).rejects.toThrow();
    });
  });

  describe('unfreeze', () => {
    it('should unfreeze receipt to pending_review', async () => {
      const borrowApp = createTestBorrowApplication();

      const batchResult = await exceptionService.batchCreate(
        [
          {
            borrowApplication: borrowApp,
            exceptionType: ExceptionType.OVERDUE,
            amount: 50,
            reason: '逾期30天',
          },
        ],
        'user001',
        '管理员'
      );

      const receiptId = batchResult.receiptIds[0];

      await exceptionService.freezeSettlement(
        receiptId,
        '存在争议',
        'admin001',
        '超级管理员',
        Role.ADMIN
      );

      await exceptionService.unfreeze(
        receiptId,
        ExceptionStatus.PENDING_REVIEW,
        '争议已解决，恢复审核',
        'admin001',
        '超级管理员',
        Role.ADMIN
      );

      const receipt = await exceptionService.getReceiptById(receiptId);
      expect(receipt?.status).toBe(ExceptionStatus.PENDING_REVIEW);
      expect(receipt?.previousStatus).toBe(ExceptionStatus.FROZEN);
    });
  });

  describe('cancelAndArchive', () => {
    it('should cancel receipt', async () => {
      const borrowApp = createTestBorrowApplication();

      const batchResult = await exceptionService.batchCreate(
        [
          {
            borrowApplication: borrowApp,
            exceptionType: ExceptionType.OVERDUE,
            amount: 50,
            reason: '逾期30天',
          },
        ],
        'user001',
        '管理员'
      );

      const receiptId = batchResult.receiptIds[0];

      await exceptionService.cancelAndArchive(
        receiptId,
        '经核实为系统误报',
        'admin001',
        '超级管理员',
        Role.ADMIN,
        false
      );

      const receipt = await exceptionService.getReceiptById(receiptId);
      expect(receipt?.status).toBe(ExceptionStatus.CANCELLED);
    });

    it('should archive receipt', async () => {
      const borrowApp = createTestBorrowApplication();

      const batchResult = await exceptionService.batchCreate(
        [
          {
            borrowApplication: borrowApp,
            exceptionType: ExceptionType.OVERDUE,
            amount: 50,
            reason: '逾期30天',
          },
        ],
        'user001',
        '管理员'
      );

      const receiptId = batchResult.receiptIds[0];

      await exceptionService.reviewDecision(
        receiptId,
        true,
        '通过',
        'reviewer001',
        '审核员',
        Role.REVIEWER
      );

      await exceptionService.cancelAndArchive(
        receiptId,
        '已处理完毕，归档',
        'admin001',
        '超级管理员',
        Role.ADMIN,
        true
      );

      const receipt = await exceptionService.getReceiptById(receiptId);
      expect(receipt?.status).toBe(ExceptionStatus.ARCHIVED);
    });
  });

  describe('updateManualReason', () => {
    it('should update manual reason', async () => {
      const borrowApp = createTestBorrowApplication();

      const batchResult = await exceptionService.batchCreate(
        [
          {
            borrowApplication: borrowApp,
            exceptionType: ExceptionType.OVERDUE,
            amount: 50,
            reason: '逾期30天',
          },
        ],
        'user001',
        '管理员'
      );

      const receiptId = batchResult.receiptIds[0];

      await exceptionService.updateManualReason(
        receiptId,
        '经与读者沟通，确认逾期原因是出差在外，情况特殊',
        'admin001',
        '超级管理员',
        Role.ADMIN
      );

      const receipt = await exceptionService.getReceiptById(receiptId);
      expect(receipt?.manualReason).toBe('经与读者沟通，确认逾期原因是出差在外，情况特殊');
    });
  });

  describe('getReceipts', () => {
    it('should filter by status', async () => {
      const borrowApp1 = createTestBorrowApplication();
      const borrowApp2 = createTestBorrowApplication();

      await exceptionService.batchCreate(
        [
          {
            borrowApplication: borrowApp1,
            exceptionType: ExceptionType.OVERDUE,
            amount: 50,
            reason: '逾期30天',
          },
          {
            borrowApplication: borrowApp2,
            exceptionType: ExceptionType.DAMAGED,
            amount: 100,
            reason: '图书污损',
          },
        ],
        'user001',
        '管理员'
      );

      const result = await exceptionService.getReceipts({
        status: ExceptionStatus.PENDING_REVIEW,
      });

      expect(result.total).toBe(2);
      expect(result.receipts.length).toBe(2);
    });
  });

  describe('data integrity - full闭环', () => {
    const createTestExpressOrder = (borrowApplicationId: string): ExpressOrder => ({
      id: uuidv4(),
      orderNo: `EXP${uuidv4().slice(0, 8)}`,
      borrowApplicationId,
      courierCompany: '顺丰速运',
      trackingNo: `SF${uuidv4().slice(0, 8)}`,
      sender: '图书馆A',
      receiver: '图书馆B',
      cost: 15,
      status: 'delivered',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const createTestCompensation = (borrowApplicationId: string, readerId: string, readerName: string): ReaderCompensation => ({
      id: uuidv4(),
      recordNo: `COMP${uuidv4().slice(0, 8)}`,
      borrowApplicationId,
      readerId,
      readerName,
      compensationType: 'damaged',
      amount: 50,
      reason: '图书封面破损',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const createTestSupplierBill = (borrowApplicationIds: string[]): SupplierBill => ({
      id: uuidv4(),
      billNo: `BILL${uuidv4().slice(0, 8)}`,
      supplierId: 'SUP001',
      supplierName: '快递服务供应商',
      borrowApplicationIds,
      totalAmount: 30,
      billDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'unpaid',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it('should write all related tables during batchCreate', async () => {
      const borrowApp = createTestBorrowApplication();
      const expressOrder = createTestExpressOrder(borrowApp.id);
      const compensation = createTestCompensation(borrowApp.id, borrowApp.readerId, borrowApp.readerName);
      const supplierBill = createTestSupplierBill([borrowApp.id]);

      const result = await exceptionService.batchCreate(
        [
          {
            borrowApplication: borrowApp,
            expressOrder,
            readerCompensation: compensation,
            supplierBill,
            exceptionType: ExceptionType.DAMAGED,
            amount: 65,
            reason: '图书污损+快递费',
          },
        ],
        'user001',
        '管理员'
      );

      expect(result.successCount).toBe(1);
      const receiptId = result.receiptIds[0];

      const savedBorrowApp = await db('borrow_applications').where('id', borrowApp.id).first();
      expect(savedBorrowApp).not.toBeUndefined();
      expect(savedBorrowApp.application_no).toBe(borrowApp.applicationNo);

      const savedExpressOrder = await db('express_orders').where('id', expressOrder.id).first();
      expect(savedExpressOrder).not.toBeUndefined();
      expect(savedExpressOrder.order_no).toBe(expressOrder.orderNo);
      expect(savedExpressOrder.borrow_application_id).toBe(borrowApp.id);

      const savedCompensation = await db('reader_compensations').where('id', compensation.id).first();
      expect(savedCompensation).not.toBeUndefined();
      expect(savedCompensation.record_no).toBe(compensation.recordNo);
      expect(savedCompensation.borrow_application_id).toBe(borrowApp.id);

      const savedSupplierBill = await db('supplier_bills').where('id', supplierBill.id).first();
      expect(savedSupplierBill).not.toBeUndefined();
      expect(savedSupplierBill.bill_no).toBe(supplierBill.billNo);

      const receipt = await db('exception_receipts').where('id', receiptId).first();
      expect(receipt.borrow_application_id).toBe(borrowApp.id);
      expect(receipt.express_order_id).toBe(expressOrder.id);
      expect(receipt.reader_compensation_id).toBe(compensation.id);
      expect(receipt.supplier_bill_id).toBe(supplierBill.id);
    });

    it('should return full detail with all related data', async () => {
      const borrowApp = createTestBorrowApplication();
      const expressOrder = createTestExpressOrder(borrowApp.id);
      const compensation = createTestCompensation(borrowApp.id, borrowApp.readerId, borrowApp.readerName);

      const result = await exceptionService.batchCreate(
        [
          {
            borrowApplication: borrowApp,
            expressOrder,
            readerCompensation: compensation,
            exceptionType: ExceptionType.DAMAGED,
            amount: 65,
            reason: '图书污损',
          },
        ],
        'user001',
        '管理员'
      );

      const receiptId = result.receiptIds[0];
      const detail = await reportService.getDetailedReceipt(receiptId);

      expect(detail).not.toBeNull();
      expect(detail.receipt.id).toBe(receiptId);
      expect(detail.borrowApplication).not.toBeNull();
      expect(detail.borrowApplication.applicationNo).toBe(borrowApp.applicationNo);
      expect(detail.borrowApplication.sourceLibrary).toBe(borrowApp.sourceLibrary);
      expect(detail.expressOrder).not.toBeNull();
      expect(detail.expressOrder.orderNo).toBe(expressOrder.orderNo);
      expect(detail.expressOrder.courierCompany).toBe(expressOrder.courierCompany);
      expect(detail.readerCompensation).not.toBeNull();
      expect(detail.readerCompensation.recordNo).toBe(compensation.recordNo);
      expect(detail.readerCompensation.compensationType).toBe(compensation.compensationType);
      expect(detail.supplierBill).toBeNull();
      expect(Array.isArray(detail.history)).toBe(true);
    });

    it('should add approval email and return in detail', async () => {
      const borrowApp = createTestBorrowApplication();

      const result = await exceptionService.batchCreate(
        [
          {
            borrowApplication: borrowApp,
            exceptionType: ExceptionType.OVERDUE,
            amount: 50,
            reason: '逾期30天',
          },
        ],
        'user001',
        '管理员'
      );

      const receiptId = result.receiptIds[0];

      const emailId = await approvalEmailService.addApprovalEmail(receiptId, {
        emailSubject: '关于逾期费用减免的审批',
        emailFrom: 'admin@library.com',
        emailTo: ['librarian@library.com'],
        emailCc: ['director@library.com'],
        emailBody: '经核实，该读者因住院导致逾期，同意减免50%费用。',
        sentAt: new Date(),
        sentBy: 'admin001',
        sentByName: '系统管理员',
      });

      expect(emailId).toBeDefined();

      const detail = await reportService.getDetailedReceipt(receiptId);
      expect(detail.approvalEmails.length).toBe(1);
      expect(detail.approvalEmails[0].id).toBe(emailId);
      expect(detail.approvalEmails[0].emailSubject).toBe('关于逾期费用减免的审批');
      expect(detail.approvalEmails[0].emailFrom).toBe('admin@library.com');
      expect(detail.approvalEmails[0].emailTo).toEqual(['librarian@library.com']);
      expect(detail.approvalEmails[0].emailCc).toEqual(['director@library.com']);
      expect(detail.approvalEmails[0].emailBody).toBe('经核实，该读者因住院导致逾期，同意减免50%费用。');
    });

    it('should export CSV with full business facts', async () => {
      const borrowApp = createTestBorrowApplication();
      const expressOrder = createTestExpressOrder(borrowApp.id);
      const compensation = createTestCompensation(borrowApp.id, borrowApp.readerId, borrowApp.readerName);
      const supplierBill = createTestSupplierBill([borrowApp.id]);

      await exceptionService.batchCreate(
        [
          {
            borrowApplication: borrowApp,
            expressOrder,
            readerCompensation: compensation,
            supplierBill,
            exceptionType: ExceptionType.DAMAGED,
            amount: 65,
            reason: '图书污损+快递费',
          },
        ],
        'user001',
        '管理员'
      );

      const filePath = await reportService.exportToCSV();
      expect(filePath).toContain('.csv');

      const fs = require('fs');
      const csvContent = fs.readFileSync(filePath, 'utf8');
      expect(csvContent).toContain(borrowApp.applicationNo);
      expect(csvContent).toContain(expressOrder.orderNo);
      expect(csvContent).toContain(compensation.recordNo);
      expect(csvContent).toContain(supplierBill.billNo);
      expect(csvContent).toContain(borrowApp.sourceLibrary);
      expect(csvContent).toContain(expressOrder.courierCompany);
      expect(csvContent).toContain('图书污损+快递费');

      fs.unlinkSync(filePath);
    });

    it('should not create duplicate records for existing related data', async () => {
      const borrowApp = createTestBorrowApplication();
      const expressOrder = createTestExpressOrder(borrowApp.id);

      await db('borrow_applications').insert({
        id: borrowApp.id,
        application_no: borrowApp.applicationNo,
        reader_id: borrowApp.readerId,
        reader_name: borrowApp.readerName,
        book_id: borrowApp.bookId,
        book_title: borrowApp.bookTitle,
        source_library: borrowApp.sourceLibrary,
        target_library: borrowApp.targetLibrary,
        apply_date: borrowApp.applyDate,
        status: 'existing',
        created_at: borrowApp.createdAt,
        updated_at: borrowApp.updatedAt,
      });

      const result = await exceptionService.batchCreate(
        [
          {
            borrowApplication: borrowApp,
            expressOrder,
            exceptionType: ExceptionType.OVERDUE,
            amount: 50,
            reason: '逾期',
          },
        ],
        'user001',
        '管理员'
      );

      expect(result.successCount).toBe(1);

      const borrowCount = await db('borrow_applications').where('id', borrowApp.id).count('* as count').first();
      expect(borrowCount?.count).toBe(1);

      const savedBorrowApp = await db('borrow_applications').where('id', borrowApp.id).first();
      expect(savedBorrowApp.status).toBe('existing');
    });
  });
});
