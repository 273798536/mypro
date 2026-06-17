import { Router, type Request, type Response } from 'express';
import { DashboardController } from '../controllers/index.js';

const router = Router();
const dashboardController = new DashboardController();

router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  await dashboardController.getStats(req, res);
});

export default router;
