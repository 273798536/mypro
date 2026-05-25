import { Router } from 'express';
import multer from 'multer';
import * as reconciliationController from '../controllers/reconciliation';

const router = Router();
const upload = multer({ dest: process.env.UPLOAD_DIR || './uploads' });

router.post('/receipts', reconciliationController.createReceipt);
router.get('/receipts', reconciliationController.listReceipts);
router.get('/receipts/:id', reconciliationController.getReceipt);
router.post('/receipts/:id/submit', reconciliationController.submitReceipt);
router.post('/receipts/:id/review', reconciliationController.submitForReview);
router.post('/receipts/:id/approve', reconciliationController.approveReceipt);
router.post('/receipts/:id/reject', reconciliationController.rejectReceipt);
router.post('/receipts/:id/modify', reconciliationController.manualModify);
router.post('/receipts/:id/freeze', reconciliationController.freezeReceipt);
router.post('/receipts/:id/unfreeze', reconciliationController.unfreezeReceipt);
router.post('/receipts/:id/withdraw', reconciliationController.withdrawReceipt);
router.post('/receipts/:id/resubmit', reconciliationController.resubmitAfterWithdraw);
router.post('/receipts/:id/archive', reconciliationController.archiveReceipt);
router.post('/receipts/:id/attachments', upload.single('file'), reconciliationController.uploadAttachment);
router.post('/import', upload.single('file'), reconciliationController.importData);
router.post('/export', reconciliationController.exportData);
router.get('/dashboard/stats', reconciliationController.getDashboardStats);

export default router;
