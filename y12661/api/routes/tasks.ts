import { Router } from 'express';
import { TaskController, ExportController } from '../controllers/index.js';

const router = Router();

router.get('/tasks', TaskController.listTasks);
router.get('/tasks/:id', TaskController.getTaskDetail);
router.put('/tasks/:id/status', TaskController.updateTaskStatus);
router.put('/tasks/:id/params', TaskController.updateParams);
router.post('/tasks/:id/recalculate', TaskController.recalculateCollision);
router.get('/tasks/:id/history', TaskController.getHistory);
router.get('/tasks/:id/materials', TaskController.getMaterials);

router.get('/export/report/:id', ExportController.getReport);
router.get('/export/materials/:id', ExportController.getMaterialPackage);

export default router;
