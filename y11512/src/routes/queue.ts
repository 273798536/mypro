import { Router, Request, Response } from 'express';
import { QueueService } from '../services/QueueService';
import { requirePermission } from '../middleware/auth';
import { PayloadType } from '../entities/RetryQueue';

const router = Router();

router.get(
  '/stats',
  requirePermission('queue:view'),
  async (req: Request, res: Response) => {
    try {
      const stats = await QueueService.getTaskStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

router.get(
  '/pending',
  requirePermission('queue:view'),
  async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const tasks = await QueueService.getPendingTasks(limit);
      res.json({
        success: true,
        data: tasks
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

router.post(
  '/enqueue',
  requirePermission('application:submit'),
  async (req: Request, res: Response) => {
    try {
      const { applicationId, payloadType, payload, maxRetryCount, retryIntervalSeconds } = req.body;
      
      if (!applicationId || !payloadType || !payload) {
        res.status(400).json({
          success: false,
          error: '缺少必要参数'
        });
        return;
      }

      const task = await QueueService.enqueue({
        applicationId,
        payloadType: payloadType as PayloadType,
        payload,
        maxRetryCount,
        retryIntervalSeconds,
        operatorId: req.user?.userId,
        operatorName: req.user?.userName
      });

      res.json({
        success: true,
        data: task
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

router.post(
  '/:taskId/freeze',
  requirePermission('queue:freeze'),
  async (req: Request, res: Response) => {
    try {
      const { reason } = req.body;
      const task = await QueueService.freezeTask(
        req.params.taskId,
        req.user!.userId,
        req.user!.userName,
        reason || '导出前冻结'
      );
      res.json({
        success: true,
        data: task
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

router.post(
  '/:taskId/unfreeze',
  requirePermission('queue:freeze'),
  async (req: Request, res: Response) => {
    try {
      const task = await QueueService.unfreezeTask(
        req.params.taskId,
        req.user!.userId,
        req.user!.userName
      );
      res.json({
        success: true,
        data: task
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

router.post(
  '/:taskId/manual',
  requirePermission('queue:manual'),
  async (req: Request, res: Response) => {
    try {
      const { note, markAsSuccess = false } = req.body;
      const task = await QueueService.manualOverride(
        req.params.taskId,
        req.user!.userId,
        req.user!.userName,
        note || '人工改判',
        markAsSuccess
      );
      res.json({
        success: true,
        data: task
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

router.post(
  '/:taskId/process',
  requirePermission('queue:manual'),
  async (req: Request, res: Response) => {
    try {
      const result = await QueueService.processTask(
        req.params.taskId,
        async (payload) => {
          console.log('处理任务:', payload);
        },
        req.user?.userId
      );
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

export default router;
