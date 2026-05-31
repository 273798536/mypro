import { Router, type Request, type Response } from 'express';
import {
  handleGetHistoryList,
  handleGetHistoryDetail,
  handleDeleteHistory,
} from '../controllers/HistoryController';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  await handleGetHistoryList(req, res);
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  await handleGetHistoryDetail(req, res);
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  await handleDeleteHistory(req, res);
});

export default router;
