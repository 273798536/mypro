import { Router } from 'express';
import multer from 'multer';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { login, getCurrentUser, changePassword } from '../controllers/authController';
import {
  submitRegistration,
  submitSignin,
  submitHomework,
  submitPriceAdjustment,
  submitHistoryArchive,
  uploadHistoryArchive
} from '../controllers/dataController';
import {
  getQueueList,
  getQueueDetail,
  handleManualTakeover,
  handleCompensateAndClose,
  handleCloseQueue,
  handleRetry,
  getQueueStatistics
} from '../controllers/queueController';
import {
  getSigninReport,
  getFailedRecords,
  getHrbpDashboard,
  exportSigninReport,
  exportFailedRecords,
  getRecordDiff,
  resolveFailedRecord
} from '../controllers/reportController';
import { AuditAction } from '../models/types';

const router = Router();

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /\.(zip|tar|gz|rar|tgz)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 .zip, .tar, .tar.gz, .rar 格式'));
    }
  }
});

router.post('/auth/login', login);
router.get('/auth/me', authenticateToken, getCurrentUser);
router.post('/auth/change-password', authenticateToken, changePassword);

router.post('/data/registration', authenticateToken, requirePermission(AuditAction.SUBMIT), submitRegistration);
router.post('/data/signin', authenticateToken, requirePermission(AuditAction.SUBMIT), submitSignin);
router.post('/data/homework', authenticateToken, requirePermission(AuditAction.SUBMIT), submitHomework);
router.post('/data/price-adjustment', authenticateToken, requirePermission(AuditAction.SUBMIT), submitPriceAdjustment);
router.post('/data/history-archive', authenticateToken, requirePermission(AuditAction.SUBMIT), submitHistoryArchive);
router.post('/data/history-archive/upload', authenticateToken, requirePermission(AuditAction.SUBMIT), upload.single('file'), uploadHistoryArchive);

router.get('/queue', authenticateToken, getQueueList);
router.get('/queue/stats', authenticateToken, getQueueStatistics);
router.get('/queue/:id', authenticateToken, getQueueDetail);
router.post('/queue/:id/manual-takeover', authenticateToken, requirePermission(AuditAction.MANUAL_TAKEOVER), handleManualTakeover);
router.post('/queue/:id/compensate', authenticateToken, requirePermission(AuditAction.COMPENSATE), handleCompensateAndClose);
router.post('/queue/:id/close', authenticateToken, requirePermission(AuditAction.CLOSE), handleCloseQueue);
router.post('/queue/:id/retry', authenticateToken, requirePermission(AuditAction.RETRY), handleRetry);

router.get('/reports/signin', authenticateToken, getSigninReport);
router.get('/reports/signin/export', authenticateToken, requirePermission(AuditAction.EXPORT), exportSigninReport);
router.get('/reports/failed-records', authenticateToken, getFailedRecords);
router.get('/reports/failed-records/export', authenticateToken, requirePermission(AuditAction.EXPORT), exportFailedRecords);
router.get('/reports/hrbp-dashboard', authenticateToken, getHrbpDashboard);
router.get('/reports/diff/:recordType/:recordId', authenticateToken, getRecordDiff);

router.post('/failed-records/:id/resolve', authenticateToken, requirePermission(AuditAction.MANUAL_TAKEOVER), resolveFailedRecord);

export default router;
