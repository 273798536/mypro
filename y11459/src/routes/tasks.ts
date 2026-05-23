import { Router } from 'express';
import { asyncTaskService } from '../services/AsyncTaskService';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { status } = req.query;
    let tasks;
    
    if (status) {
      tasks = await asyncTaskService.getPendingTasks();
    } else {
      const taskRepository = (await import('../database')).AppDataSource.getRepository(
        (await import('../entities/AsyncTask')).AsyncTask
      );
      tasks = await taskRepository.find({
        order: { createdAt: 'DESC' },
        take: 100,
      });
    }

    res.json({ success: true, data: tasks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const task = await asyncTaskService.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }

    res.json({ success: true, data: task });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/retry', async (req: AuthenticatedRequest, res) => {
  try {
    const task = await asyncTaskService.retryTask(req.params.id, req.user?.id);
    res.json({ success: true, data: task });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/assign', async (req: AuthenticatedRequest, res) => {
  try {
    const { assignedTo, resolutionNote } = req.body;
    const task = await asyncTaskService.assignToManual(
      req.params.id,
      assignedTo,
      resolutionNote,
      req.user?.id
    );
    res.json({ success: true, data: task });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/resolve', async (req: AuthenticatedRequest, res) => {
  try {
    const { resolved, resolutionNote } = req.body;
    const task = await asyncTaskService.resolveManualTask(
      req.params.id,
      resolved,
      resolutionNote,
      req.user?.id
    );
    res.json({ success: true, data: task });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
