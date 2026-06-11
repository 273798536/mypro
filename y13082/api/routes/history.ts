import { Router } from 'express';
import { HistoryController } from '../controllers/index.js';

const router = Router();

router.get('/', HistoryController.list);

export default router;
