import { Router } from 'express';
import { HistoryController } from '../controllers/HistoryController.js';
import { ReportController } from '../controllers/ReportController.js';

const router = Router({ mergeParams: true });

router.get('/', HistoryController.list);
router.get('/diff', HistoryController.diff);
router.get('/report', ReportController.preview);
router.get('/report/download', ReportController.download);
router.get('/trace', ReportController.trace);
router.post('/review', HistoryController.submitReview);

export default router;
