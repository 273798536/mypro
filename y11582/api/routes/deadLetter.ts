
import { Router } from 'express';
import { deadLetterController } from '../controllers/deadLetterController.js';
import { authMiddleware, requireRole, PERMISSIONS } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, requireRole(...PERMISSIONS.READ), deadLetterController.getDeadLetters);
router.post('/:id/revive', authMiddleware, requireRole(...PERMISSIONS.MANAGE), deadLetterController.reviveDeadLetter);

export default router;
