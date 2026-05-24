import { Router } from 'express';
import retryQueueRouter from './retryQueue';
import deadLetterQueueRouter from './deadLetterQueue';
import exportRouter from './export';
import historyRouter from './history';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use('/retry-queue', requireAuth, retryQueueRouter);
router.use('/dead-letter-queue', requireAuth, requireRole('manager'), deadLetterQueueRouter);
router.use('/export', requireAuth, exportRouter);
router.use('/history', requireAuth, historyRouter);

router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'warehouse-retry-queue-service',
    },
  });
});

export default router;
