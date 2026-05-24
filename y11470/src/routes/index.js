const express = require('express');
const router = express.Router();

const ApplicationController = require('../controllers/ApplicationController');
const BatchController = require('../controllers/BatchController');
const AttachmentController = require('../controllers/AttachmentController');
const ApprovalEmailController = require('../controllers/ApprovalEmailController');
const ExceptionController = require('../controllers/ExceptionController');
const ExportController = require('../controllers/ExportController');
const FailedRecordController = require('../controllers/FailedRecordController');
const AutoCheckService = require('../services/AutoCheckService');

const { authMiddleware } = require('../middleware/auth');

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '仓库退供复核异常回执状态机服务运行正常',
    timestamp: Math.floor(Date.now() / 1000)
  });
});

router.post('/applications', authMiddleware('CREATE_APPLICATION'), ApplicationController.create);
router.get('/applications', authMiddleware('VIEW_HISTORY'), ApplicationController.getAll);
router.get('/applications/:id', authMiddleware('VIEW_HISTORY'), ApplicationController.getById);
router.get('/summary/applications', authMiddleware('VIEW_HISTORY'), ApplicationController.getSummary);

router.post('/batches', authMiddleware('CREATE_BATCH'), BatchController.create);
router.get('/batches', authMiddleware('VIEW_HISTORY'), BatchController.getAll);
router.get('/batches/:id', authMiddleware('VIEW_HISTORY'), BatchController.getById);
router.get('/summary/batches', authMiddleware('VIEW_HISTORY'), BatchController.getSummary);
router.get('/internal/batches', authMiddleware('VIEW_HISTORY'), BatchController.getInternalView);

router.post('/batches/:id/quality-inspection', authMiddleware('QUALITY_INSPECTION'), BatchController.qualityInspection);
router.post('/batches/:id/review', authMiddleware('REVIEW'), BatchController.review);
router.post('/batches/:id/review-revise', authMiddleware('REVIEW_REVISE'), BatchController.reviewRevise);
router.post('/batches/:id/freeze', authMiddleware('FREEZE'), BatchController.freeze);
router.post('/batches/:id/unfreeze', authMiddleware('UNFREEZE'), BatchController.unfreeze);
router.post('/batches/:id/settle', authMiddleware('SETTLE'), BatchController.settle);
router.post('/batches/:id/archive', authMiddleware('ARCHIVE'), BatchController.archive);

router.post('/attachments', authMiddleware('UPLOAD_ATTACHMENT'), AttachmentController.getUploadMiddleware(), AttachmentController.upload);
router.get('/attachments/batch/:batchId', authMiddleware('VIEW_HISTORY'), AttachmentController.getByBatchId);
router.get('/attachments/application/:applicationId', authMiddleware('VIEW_HISTORY'), AttachmentController.getByApplicationId);

router.post('/approval-emails', authMiddleware('UPLOAD_APPROVAL_EMAIL'), ApprovalEmailController.create);
router.get('/approval-emails/:id', authMiddleware('VIEW_HISTORY'), ApprovalEmailController.getById);
router.get('/approval-emails/application/:applicationId', authMiddleware('VIEW_HISTORY'), ApprovalEmailController.getByApplicationId);
router.get('/approval-emails/batch/:batchId', authMiddleware('VIEW_HISTORY'), ApprovalEmailController.getByBatchId);
router.post('/approval-emails/:id/exception', authMiddleware('VIEW_EXCEPTIONS'), ApprovalEmailController.markAsException);

router.post('/member-cancel', authMiddleware('MEMBER_CANCEL'), ExceptionController.memberCancel);
router.get('/exceptions', authMiddleware('VIEW_EXCEPTIONS'), ExceptionController.getAllReservedExceptions);
router.get('/exceptions/:applicationId', authMiddleware('VIEW_EXCEPTIONS'), ExceptionController.getExceptionDetails);
router.get('/exceptions/:applicationId/verify', authMiddleware('VIEW_EXCEPTIONS'), ExceptionController.verifyIntegrity);

router.get('/export/batches', authMiddleware('EXPORT'), ExportController.exportBatches);
router.get('/export/internal', authMiddleware('EXPORT'), ExportController.exportInternalView);
router.get('/export/summary', authMiddleware('EXPORT'), ExportController.exportSummary);

router.get('/failed-records', authMiddleware('VIEW_FAILED_RECORDS'), FailedRecordController.getAll);
router.get('/failed-records/:id', authMiddleware('VIEW_FAILED_RECORDS'), FailedRecordController.getById);
router.post('/failed-records/:id/resolve', authMiddleware('VIEW_FAILED_RECORDS'), FailedRecordController.markResolved);

router.get('/auto-check', authMiddleware('AUTO_CHECK'), async (req, res) => {
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
