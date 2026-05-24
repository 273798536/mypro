
import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController';

const router = Router();

router.get('/stats', dashboardController.getStats);
router.get('/retry-categories', dashboardController.getRetryCategories);

export default router;
