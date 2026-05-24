import { Router } from 'express';
import { taskController } from '../controllers/task.controller';

const router = Router();

router.get('/', taskController.getTasks.bind(taskController));
router.get('/statistics', taskController.getStatistics.bind(taskController));
router.get('/:id', taskController.getTaskById.bind(taskController));
router.post('/:id/retry', taskController.retryTask.bind(taskController));
router.post('/reconcile', taskController.reconcile.bind(taskController));
router.post('/replay-exceptions', taskController.replayExceptions.bind(taskController));
router.post('/verify-consistency', taskController.verifyCrossConsistency.bind(taskController));

export default router;
