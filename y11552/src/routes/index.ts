import { Router } from 'express';
import { factController } from '../controllers/factController';
import { authMiddleware, requireOperator } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/facts', requireOperator, factController.submit);
router.get('/facts', factController.list);
router.get('/facts/dashboard', factController.dashboard);
router.get('/facts/:id', factController.getById);
router.get('/facts/:id/history', factController.getHistory);
router.post('/facts/:id/decision', requireOperator, factController.manualDecision);
router.post('/facts/:id/close', requireOperator, factController.close);
router.post('/facts/:id/compensate', requireOperator, factController.compensate);
router.post('/facts/:id/receipt', requireOperator, factController.addReceipt);
router.post('/facts/:id/freeze', requireOperator, factController.freeze);
router.post('/facts/:id/unfreeze', requireOperator, factController.unfreeze);
router.post('/facts/:id/retry-dead-letter', requireOperator, factController.retryDeadLetter);
router.post('/export', requireOperator, factController.export);
router.post('/trigger-retry', requireOperator, factController.triggerRetry);

export default router;
