
import { type Request, type Response } from 'express';
import { queueService } from '../services/queueService.js';
import type { TaskStatus, SourceType } from '../../shared/types.js';

function getOperator(req: Request): string {
  return req.user?.username || 'system';
}

export const taskController = {
  async createTask(req: Request, res: Response): Promise<void> {
    try {
      const task = queueService.createTask(req.body, getOperator(req));
      res.status(201).json(task);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Duplicate')) {
        res.status(409).json({ error: message });
      } else {
        res.status(400).json({ error: message });
      }
    }
  },

  getTask(req: Request, res: Response): void {
    const task = queueService.getTask(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(task);
  },

  getTasks(req: Request, res: Response): void {
    const { status, sourceType } = req.query;
    const filters: { status?: TaskStatus; sourceType?: SourceType } = {};
    if (status && typeof status === 'string') {
      filters.status = status as TaskStatus;
    }
    if (sourceType && typeof sourceType === 'string') {
      filters.sourceType = sourceType as SourceType;
    }
    const tasks = queueService.getTasks(filters);
    res.json(tasks);
  },

  getTaskHistory(req: Request, res: Response): void {
    const history = queueService.getTaskHistory(req.params.id);
    res.json(history);
  },

  getTaskEvidence(req: Request, res: Response): void {
    const evidence = queueService.getTaskEvidence(req.params.id);
    res.json(evidence);
  },

  async retryTask(req: Request, res: Response): Promise<void> {
    try {
      const task = await queueService.manualRetry(
        req.params.id,
        getOperator(req)
      );
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  manualOverride(req: Request, res: Response): void {
    try {
      const { standardData, remark } = req.body;
      const task = queueService.manualOverride(
        req.params.id,
        standardData,
        getOperator(req),
        remark
      );
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  compensate(req: Request, res: Response): void {
    try {
      const { remark } = req.body;
      const task = queueService.compensate(
        req.params.id,
        getOperator(req),
        remark
      );
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  close(req: Request, res: Response): void {
    try {
      const { remark } = req.body;
      const task = queueService.close(
        req.params.id,
        getOperator(req),
        remark
      );
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  markPermanentFailed(req: Request, res: Response): void {
    try {
      const { remark } = req.body;
      const task = queueService.markPermanentFailed(
        req.params.id,
        getOperator(req),
        remark
      );
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
};
