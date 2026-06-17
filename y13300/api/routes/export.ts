import { Router, type Request, type Response } from 'express';
import { ExportController } from '../controllers/index.js';

const router = Router();
const exportController = new ExportController();

router.get('/:id/export', async (req: Request, res: Response): Promise<void> => {
  await exportController.exportTicket(req, res);
});

export default router;
