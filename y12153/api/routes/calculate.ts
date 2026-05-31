import { Router, type Request, type Response } from 'express';
import { handleCalculate } from '../controllers/CalculateController';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  await handleCalculate(req, res);
});

export default router;
