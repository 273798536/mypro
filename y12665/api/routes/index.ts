import { Router } from 'express';
import exercisesRouter from './exercises.js';
import screenshotsRouter from './screenshots.js';
import exportRouter from './export.js';
import testRouter from './test.js';

const router = Router();

router.use('/exercises', exercisesRouter);
router.use('/screenshots', screenshotsRouter);
router.use('/export', exportRouter);
router.use('/test', testRouter);

export default router;
