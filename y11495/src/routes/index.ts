import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import {
  createBatch,
  getBatch,
  listBatches,
  submitForProcessing,
  submitForReview,
  freezeBatch,
  unfreezeBatch,
  approveBatch,
  rejectBatch,
  withdrawBatch,
  resubmitBatch,
  archiveBatch,
} from '../controllers/batch.controller';
import {
  uploadFile,
  getBatchFiles,
  deleteFile,
} from '../controllers/file.controller';
import {
  runAudit,
  getExceptions,
  confirmException,
  overruleException,
  dismissException,
  exportReport,
  getDashboard,
  getAuditLogs,
} from '../controllers/audit.controller';
import { AuditAction } from '../types';

const router = Router();

router.use(authenticate);

router.post('/batches', requirePermission(AuditAction.BATCH_CREATE), createBatch);
router.get('/batches', requirePermission(AuditAction.BATCH_VIEW), listBatches);
router.get('/batches/:batchId', requirePermission(AuditAction.BATCH_VIEW), getBatch);
router.post('/batches/:batchId/process', requirePermission(AuditAction.BATCH_SUBMIT), submitForProcessing);
router.post('/batches/:batchId/review', requirePermission(AuditAction.BATCH_SUBMIT), submitForReview);
router.post('/batches/:batchId/freeze', requirePermission(AuditAction.BATCH_FREEZE), freezeBatch);
router.post('/batches/:batchId/unfreeze', requirePermission(AuditAction.BATCH_FREEZE), unfreezeBatch);
router.post('/batches/:batchId/approve', requirePermission(AuditAction.BATCH_APPROVE), approveBatch);
router.post('/batches/:batchId/reject', requirePermission(AuditAction.BATCH_APPROVE), rejectBatch);
router.post('/batches/:batchId/withdraw', requirePermission(AuditAction.BATCH_WITHDRAW), withdrawBatch);
router.post('/batches/:batchId/resubmit', requirePermission(AuditAction.BATCH_SUBMIT), resubmitBatch);
router.post('/batches/:batchId/archive', requirePermission(AuditAction.BATCH_ARCHIVE), archiveBatch);

router.post('/batches/:batchId/files', requirePermission(AuditAction.FILE_UPLOAD), uploadFile);
router.get('/batches/:batchId/files', requirePermission(AuditAction.BATCH_VIEW), getBatchFiles);
router.delete('/files/:fileId', requirePermission(AuditAction.FILE_DELETE), deleteFile);

router.post('/batches/:batchId/audit', requirePermission(AuditAction.EXCEPTION_DETECT), runAudit);
router.get('/batches/:batchId/exceptions', requirePermission(AuditAction.BATCH_VIEW), getExceptions);
router.post('/exceptions/:exceptionId/confirm', requirePermission(AuditAction.EXCEPTION_CONFIRM), confirmException);
router.post('/exceptions/:exceptionId/overrule', requirePermission(AuditAction.EXCEPTION_OVERRULE), overruleException);
router.post('/exceptions/:exceptionId/dismiss', requirePermission(AuditAction.EXCEPTION_DISMISS), dismissException);

router.get('/batches/:batchId/export', requirePermission(AuditAction.BATCH_EXPORT), exportReport);
router.get('/batches/:batchId/dashboard', requirePermission(AuditAction.BATCH_VIEW), getDashboard);

router.get('/audit-logs', requirePermission(AuditAction.BATCH_VIEW), getAuditLogs);

export default router;
