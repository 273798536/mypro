
import { Router } from 'express';
import { taskController } from '../controllers/taskController.js';
import { authMiddleware, requireRole, PERMISSIONS } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, requireRole(...PERMISSIONS.READ), taskController.getTasks);
router.get('/:id', authMiddleware, requireRole(...PERMISSIONS.READ), taskController.getTask);
router.get('/:id/history', authMiddleware, requireRole(...PERMISSIONS.READ), taskController.getTaskHistory);
router.get('/:id/evidence', authMiddleware, requireRole(...PERMISSIONS.READ), taskController.getTaskEvidence);

router.post('/', authMiddleware, requireRole(...PERMISSIONS.WRITE), taskController.createTask);
router.put('/:id/retry', authMiddleware, requireRole(...PERMISSIONS.WRITE), taskController.retryTask);
router.put('/:id/manual', authMiddleware, requireRole(...PERMISSIONS.WRITE), taskController.manualOverride);
router.put('/:id/compensate', authMiddleware, requireRole(...PERMISSIONS.MANAGE), taskController.compensate);
router.put('/:id/close', authMiddleware, requireRole(...PERMISSIONS.MANAGE), taskController.close);
router.put('/:id/permanent-failed', authMiddleware, requireRole(...PERMISSIONS.MANAGE), taskController.markPermanentFailed);

export default router;
