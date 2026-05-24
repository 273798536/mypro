import { exceptionService } from '../src/services/exceptionService';
import { ExceptionStatus, ExceptionType, Role, BorrowApplication } from '../src/types';
import db from '../src/db';
import { v4 as uuidv4 } from 'uuid';

describe('ExceptionService', () => {
  const createTestBorrowApplication = (): BorrowApplication => ({
    id: uuidv4(),
    applicationNo: `APP${Date.now()}`,
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
});
