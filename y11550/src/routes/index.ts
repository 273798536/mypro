import { Router } from 'express';
import { ReceiptController } from '../controllers/ReceiptController';
import { ReportController } from '../controllers/ReportController';
import { AutoCheckController } from '../controllers/AutoCheckController';
import { ApprovalEmailController } from '../controllers/ApprovalEmailController';
import { AutoCheckService } from '../services/AutoCheckService';
import { validateCreateReceipt, validateStatusTransition, validateApprovalEmailImport } from '../middleware/validation';
import { requirePermission, requireRole } from '../middleware/permission';

export const createRoutes = (
  receiptController: ReceiptController,
  reportController: ReportController,
  autoCheckController: AutoCheckController,
  approvalEmailController: ApprovalEmailController,
  autoCheckService: AutoCheckService
): Router => {
  const router = Router();

  router.get('/health', (req, res) => {
    res.json({
      success: true,
      message: '智能柜补货异常回执状态机 API 运行正常',
      timestamp: new Date().toISOString()
    });
  });

  const receiptRouter = Router();
  receiptRouter.post(
    '/',
    validateCreateReceipt(autoCheckService),
    requirePermission(autoCheckService, 'create'),
    receiptController.createReceipt
  );
  receiptRouter.get(
    '/',
    requirePermission(autoCheckService, 'read'),
    receiptController.listReceipts
  );
  receiptRouter.get(
    '/batch/:batchNo',
    requirePermission(autoCheckService, 'read'),
    receiptController.getReceiptByBatchNo
  );
  receiptRouter.get(
    '/failed-records',
    requirePermission(autoCheckService, 'read'),
    receiptController.getFailedRecords
  );
  receiptRouter.get(
    '/:id',
    requirePermission(autoCheckService, 'read'),
    receiptController.getReceipt
  );
  receiptRouter.put(
    '/:id',
    requirePermission(autoCheckService, 'update_draft'),
    receiptController.updateReceipt
  );
  receiptRouter.post(
    '/:id/transition',
    validateStatusTransition,
    requirePermission(autoCheckService, 'review'),
    receiptController.transitionStatus
  );
  receiptRouter.post(
    '/:id/attachments',
    requirePermission(autoCheckService, 'add_attachment'),
    receiptController.addAttachments
  );
  receiptRouter.post(
    '/:id/archive',
    requireRole(['admin']),
    receiptController.archiveReceipt
  );
  receiptRouter.post(
    '/:id/revert',
    requireRole(['admin']),
    receiptController.revertToStatus
  );
  router.use('/receipts', receiptRouter);

  const reportRouter = Router();
  reportRouter.get(
    '/summary',
    requirePermission(autoCheckService, 'read'),
    reportController.getSummaryReport
  );
  reportRouter.get(
    '/detail',
    requirePermission(autoCheckService, 'read'),
    reportController.getDetailedReport
  );
  reportRouter.get(
    '/export/excel',
    requirePermission(autoCheckService, 'read'),
    reportController.exportToExcel
  );
  reportRouter.get(
    '/export/csv',
    requirePermission(autoCheckService, 'read'),
    reportController.exportToCsv
  );
  reportRouter.post(
    '/verify-consistency',
    requirePermission(autoCheckService, 'read'),
    reportController.verifyExportConsistency
  );
  router.use('/reports', reportRouter);

  const checkRouter = Router();
  checkRouter.get(
    '/all',
    requireRole(['admin', 'supervisor']),
    autoCheckController.runAllChecks
  );
  checkRouter.get(
    '/duplicate-imports',
    requireRole(['admin', 'supervisor']),
    autoCheckController.checkDuplicateImports
  );
  checkRouter.get(
    '/exception-retention',
    requireRole(['admin', 'supervisor']),
    autoCheckController.checkExceptionRetention
  );
  checkRouter.get(
    '/data-consistency',
    requireRole(['admin', 'supervisor']),
    autoCheckController.checkDataConsistency
  );
  checkRouter.get(
    '/stock-overflow',
    requireRole(['admin', 'supervisor']),
    autoCheckController.checkStockOverflow
  );
  checkRouter.get(
    '/history-integrity',
    requireRole(['admin', 'supervisor']),
    autoCheckController.checkHistoryIntegrity
  );
  checkRouter.post(
    '/verify-export',
    requirePermission(autoCheckService, 'read'),
    autoCheckController.verifyExportConsistency
  );
  router.use('/checks', checkRouter);

  const emailRouter = Router();
  emailRouter.post(
    '/',
    validateApprovalEmailImport,
    requirePermission(autoCheckService, 'read'),
    approvalEmailController.importApprovalEmail
  );
  emailRouter.post(
    '/batch',
    requirePermission(autoCheckService, 'read'),
    approvalEmailController.importApprovalEmailsBatch
  );
  emailRouter.get(
    '/',
    requirePermission(autoCheckService, 'read'),
    approvalEmailController.getApprovalEmails
  );
  emailRouter.post(
    '/link',
    requirePermission(autoCheckService, 'read'),
    approvalEmailController.linkEmailToReceipt
  );
  router.use('/approval-emails', emailRouter);

  return router;
};
