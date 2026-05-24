
import { Router } from 'express';
import { taskController } from '../controllers/taskController';

const router = Router();

router.post('/', taskController.createTask);
router.get('/', taskController.getTasks);
router.get('/:id', taskController.getTask);
router.get('/:id/history', taskController.getTaskHistory);
router.get('/:id/evidence', taskController.getTaskEvidence);
router.put('/:id/retry', taskController.retryTask);
router.put('/:id/manual', taskController.manualOverride);
router.put('/:id/compensate', taskController.compensate);
router.put('/:id/close', taskController.close);
router.put('/:id/permanent-failed', taskController.markPermanentFailed);

export default router;
