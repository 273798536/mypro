const express = require('express');
const router = express.Router();

const ApplicationController = require('../controllers/ApplicationController');
const BatchController = require('../controllers/BatchController');
const AttachmentController = require('../controllers/AttachmentController');
const ExceptionController = require('../controllers/ExceptionController');
const ExportController = require('../controllers/ExportController');
const FailedRecordController = require('../controllers/FailedRecordController');
const AutoCheckService = require('../services/AutoCheckService');

const { authMiddleware, PERMISSIONS } = require('../middleware/auth');

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '仓库退供复核异常回执状态机服务运行正常',
    timestamp: Math.floor(Date.now() / 1000)
  });
});

router.post('/applications', authMiddleware(PERMISSIONS.CREATE_APPLICATION), ApplicationController.create);
router.get('/applications', authMiddleware(PERMISSIONS.VIEW_HISTORY), ApplicationController.getAll);
router.get('/applications/:id', authMiddleware(PERMISSIONS.VIEW_HISTORY), ApplicationController.getById);
router.get('/summary/applications', authMiddleware(PERMISSIONS.VIEW_HISTORY), ApplicationController.getSummary);

router.post('/batches', authMiddleware(PERMISSIONS.CREATE_BATCH), BatchController.create);
router.get('/batches', authMiddleware(PERMISSIONS.VIEW_HISTORY), BatchController.getAll);
router.get('/batches/:id', authMiddleware(PERMISSIONS.VIEW_HISTORY), BatchController.getById);
router.get('/summary/batches', authMiddleware(PERMISSIONS.VIEW_HISTORY), BatchController.getSummary);
router.get('/internal/batches', authMiddleware(PERMISSIONS.VIEW_HISTORY), BatchController.getInternalView);

router.post('/batches/:id/quality-inspection', authMiddleware(PERMISSIONS.QUALITY_INSPECTION), BatchController.qualityInspection);
router.post('/batches/:id/review', authMiddleware(PERMISSIONS.REVIEW), BatchController.review);
router.post('/batches/:id/review-revise', authMiddleware(PERMISSIONS.REVIEW_REVISE), BatchController.reviewRevise);
router.post('/batches/:id/freeze', authMiddleware(PERMISSIONS.FREEZE), BatchController.freeze);
router.post('/batches/:id/unfreeze', authMiddleware(PERMISSIONS.UNFREEZE), BatchController.unfreeze);
router.post('/batches/:id/settle', authMiddleware(PERMISSIONS.SETTLE), BatchController.settle);
router.post('/batches/:id/archive', authMiddleware(PERMISSIONS.ARCHIVE), BatchController.archive);

router.post('/attachments', authMiddleware(PERMISSIONS.UPLOAD_ATTACHMENT), AttachmentController.getUploadMiddleware(), AttachmentController.upload);
router.get('/attachments/batch/:batchId', authMiddleware(PERMISSIONS.VIEW_HISTORY), AttachmentController.getByBatchId);
router.get('/attachments/application/:applicationId', authMiddleware(PERMISSIONS.VIEW_HISTORY), AttachmentController.getByApplicationId);

router.post('/member-cancel', authMiddleware(PERMISSIONS.MEMBER_CANCEL), ExceptionController.memberCancel);
router.get('/exceptions', authMiddleware(PERMISSIONS.VIEW_EXCEPTIONS), ExceptionController.getAllReservedExceptions);
router.get('/exceptions/:applicationId', authMiddleware(PERMISSIONS.VIEW_EXCEPTIONS), ExceptionController.getExceptionDetails);
router.get('/exceptions/:applicationId/verify', authMiddleware(PERMISSIONS.VIEW_EXCEPTIONS), ExceptionController.verifyIntegrity);

router.get('/export/batches', authMiddleware(PERMISSIONS.EXPORT), ExportController.exportBatches);
router.get('/export/internal', authMiddleware(PERMISSIONS.EXPORT), ExportController.exportInternalView);
router.get('/export/summary', authMiddleware(PERMISSIONS.EXPORT), ExportController.exportSummary);

router.get('/failed-records', authMiddleware(PERMISSIONS.VIEW_FAILED_RECORDS), FailedRecordController.getAll);
router.get('/failed-records/:id', authMiddleware(PERMISSIONS.VIEW_FAILED_RECORDS), FailedRecordController.getById);
router.post('/failed-records/:id/resolve', authMiddleware(PERMISSIONS.VIEW_FAILED_RECORDS), FailedRecordController.markResolved);

router.get('/auto-check', authMiddleware(PERMISSIONS.VIEW_EXCEPTIONS), async (req, res) => {
  try {
    const results = await AutoCheckService.runAllChecks();
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
