import { Request, Response } from 'express';
import { TaskStatus } from '../types';
import { taskService } from '../services/task.service';
import { reconciliationService } from '../services/reconciliation.service';
import { logger } from '../utils/logger';

export class TaskController {
  public async getTasks(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, pageSize = 20, status } = req.query;

      const result = await taskService.getAllTasks({
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        status: status as TaskStatus,
      });

      res.json({
        success: true,
        data: {
          tasks: result.tasks,
          total: result.total,
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string),
        },
      });
    } catch (error) {
      logger.error('Failed to get tasks', error as Error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  public async getTaskById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const task = await taskService.getTaskById(id);

      if (!task) {
        res.status(404).json({
          success: false,
          error: 'Task not found',
        });
        return;
      }

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      logger.error('Failed to get task', error as Error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  public async retryTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const task = await taskService.getTaskById(id);
      if (!task) {
        res.status(404).json({
          success: false,
          error: 'Task not found',
        });
        return;
      }

      await taskService.retryTask(id);

      const retryTask = await taskService.getTaskById(id);
      if (retryTask) {
        await taskService.processTask(retryTask);
      }

      const updatedTask = await taskService.getTaskById(id);

      logger.info('Task retried', { taskId: id });

      res.json({
        success: true,
        data: updatedTask,
        message: 'Task retried successfully',
      });
    } catch (error) {
      logger.error('Failed to retry task', error as Error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  public async reconcile(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Starting reconciliation via API');

      const result = await reconciliationService.performReconciliation();

      res.json({
        success: true,
        data: result,
        message: 'Reconciliation completed',
      });
    } catch (error) {
      logger.error('Failed to perform reconciliation', error as Error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  public async replayExceptions(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Starting exception replay via API');

      const result = await reconciliationService.replayExceptions();

      res.json({
        success: true,
        data: result,
        message: `Replayed ${result.totalReplayed} exceptions (${result.successCount} success, ${result.failedCount} failed)`,
      });
    } catch (error) {
      logger.error('Failed to replay exceptions', error as Error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  public async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const stats = await reconciliationService.getStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get statistics', error as Error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  public async verifyCrossConsistency(req: Request, res: Response): Promise<void> {
    try {
      const result = await reconciliationService.verifyCrossRecordConsistency();

      res.json({
        success: true,
        data: result,
        message: `Verified ${result.totalChecks} records, found ${result.issues.length} issues`,
      });
    } catch (error) {
      logger.error('Failed to verify cross consistency', error as Error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
}

export const taskController = new TaskController();
