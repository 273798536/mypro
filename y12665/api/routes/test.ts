import { Router, type Request, type Response, type NextFunction } from 'express';
import { testService } from '../services/TestService.js';

const router = Router();

router.post(
  '/repeat-import',
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = testService.runDuplicateImportTest();
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
