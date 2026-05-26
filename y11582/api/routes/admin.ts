
import { Router } from 'express';
import { adminController } from '../controllers/adminController.js';
import { authMiddleware, requireRole, PERMISSIONS } from '../middleware/auth.js';

const router = Router();

router.post('/resume', authMiddleware, requireRole(...PERMISSIONS.ADMIN_ONLY), adminController.resumeProcessing);
router.post('/start', authMiddleware, requireRole(...PERMISSIONS.ADMIN_ONLY), adminController.startProcessing);
router.post('/stop', authMiddleware, requireRole(...PERMISSIONS.ADMIN_ONLY), adminController.stopProcessing);

export default router;
