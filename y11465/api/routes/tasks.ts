import { Router, Request, Response } from 'express';
import taskRepository from '../repositories/TaskRepository';
import taskQueueService from '../services/TaskQueueService';
import type { TaskStatus } from '../../shared/types';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { page = '1', pageSize = '20', status, type } = req.query;
  
  const result = taskRepository.findAll({
    page: parseInt(page as string),
    pageSize: parseInt(pageSize as string),
    status: status as TaskStatus,
    type: type as string
  });
  
  res.json(result);
});

router.get('/stats', (req: Request, res: Response) => {
  const stats = taskRepository.getStats();
  res.json(stats);
});

router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const task = taskRepository.findById(id);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  res.json(task);
});

router.post('/:id/retry', (req: Request, res: Response) => {
  const { id } = req.params;
  const { operatedBy } = req.body;
  
  try {
    const task = taskRepository.retry(id, operatedBy);
    res.json({ success: true, task });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/manual', (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, remark, operatedBy } = req.body;
  
  try {
    const task = taskRepository.manualProcess(id, action, remark, operatedBy);
    res.json({ success: true, task });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/', (req: Request, res: Response) => {
  const { batchId, documentId, type, payload, maxRetries } = req.body;
  
  try {
    const task = taskQueueService.createTask({
      batchId,
      documentId,
      type,
      payload,
      maxRetries
    });
    res.status(201).json(task);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
