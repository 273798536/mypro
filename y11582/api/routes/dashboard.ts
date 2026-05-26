
import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController.js';
import { authMiddleware, requireRole, PERMISSIONS } from '../middleware/auth.js';

const router = Router();

router.get('/stats', authMiddleware, requireRole(...PERMISSIONS.READ), dashboardController.getStats);
router.get('/retry-categories', authMiddleware, requireRole(...PERMISSIONS.READ), dashboardController.getRetryCategories);

export default router;
