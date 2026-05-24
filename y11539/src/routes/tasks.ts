import { Router, Request, Response } from 'express';
import { TaskService } from '../services/task-service';
import { TaskStatus } from '../types';
import Joi from 'joi';

const router = Router();

const createTaskSchema = Joi.object({
  taskType: Joi.string().required(),
  payload: Joi.object().required(),
  batchId: Joi.string().optional(),
  maxRetries: Joi.number().integer().min(1).max(10).default(3)
});

const retryTaskSchema = Joi.object({
  operatedBy: Joi.string().required()
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { error, value } = createTaskSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const task = await TaskService.createTask(
      value.taskType,
      value.payload,
      value.batchId,
      value.maxRetries
    );

    res.status(201).json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as TaskStatus | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;

    const result = await TaskService.listTasks(status, page, pageSize);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await TaskService.getTaskStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const task = await TaskService.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/retry', async (req: Request, res: Response) => {
  try {
    const { error, value } = retryTaskSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const task = await TaskService.manuallyRetryTask(
      req.params.id,
      value.operatedBy
    );

    res.json(task);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
