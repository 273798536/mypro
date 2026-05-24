import { Router } from 'express';
import { ReceiptController } from '../controllers/ReceiptController';
import { ReportController } from '../controllers/ReportController';
import { AutoCheckController } from '../controllers/AutoCheckController';

export const createRoutes = (
  receiptController: ReceiptController,
  reportController: ReportController,
  autoCheckController: AutoCheckController
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
  receiptRouter.post('/', receiptController.createReceipt);
  receiptRouter.get('/', receiptController.listReceipts);
  receiptRouter.get('/batch/:batchNo', receiptController.getReceiptByBatchNo);
  receiptRouter.get('/failed-records', receiptController.getFailedRecords);
  receiptRouter.get('/:id', receiptController.getReceipt);
  receiptRouter.put('/:id', receiptController.updateReceipt);
  receiptRouter.post('/:id/transition', receiptController.transitionStatus);
  receiptRouter.post('/:id/attachments', receiptController.addAttachments);
  receiptRouter.post('/:id/archive', receiptController.archiveReceipt);
  receiptRouter.post('/:id/revert', receiptController.revertToStatus);
  router.use('/receipts', receiptRouter);

  const reportRouter = Router();
  reportRouter.get('/summary', reportController.getSummaryReport);
  reportRouter.get('/detail', reportController.getDetailedReport);
  reportRouter.get('/export/excel', reportController.exportToExcel);
  reportRouter.get('/export/csv', reportController.exportToCsv);
  reportRouter.post('/verify-consistency', reportController.verifyExportConsistency);
  router.use('/reports', reportRouter);

  const checkRouter = Router();
  checkRouter.get('/all', autoCheckController.runAllChecks);
  checkRouter.get('/duplicate-imports', autoCheckController.checkDuplicateImports);
  checkRouter.get('/exception-retention', autoCheckController.checkExceptionRetention);
  checkRouter.get('/data-consistency', autoCheckController.checkDataConsistency);
  checkRouter.get('/stock-overflow', autoCheckController.checkStockOverflow);
  checkRouter.get('/history-integrity', autoCheckController.checkHistoryIntegrity);
  checkRouter.post('/verify-export', autoCheckController.verifyExportConsistency);
  router.use('/checks', checkRouter);

  return router;
};
