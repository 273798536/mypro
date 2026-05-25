import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { DeadLetter, DeadLetterStatus } from '../entities/DeadLetter';
import { QueueService } from '../services/QueueService';
import { requirePermission } from '../middleware/auth';

const router = Router();
const repository = AppDataSource.getRepository(DeadLetter);

router.get(
  '/',
  requirePermission('deadletter:view'),
  async (req: Request, res: Response) => {
    try {
      const status = req.query.status as DeadLetterStatus;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const where: any = {};
      if (status) {
        where.status = status;
      }

      const deadLetters = await repository.find({
        where,
        order: { createdAt: 'DESC' },
        take: limit
      });

      res.json({
        success: true,
        data: deadLetters
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
  '/:deadLetterId',
  requirePermission('deadletter:view'),
  async (req: Request, res: Response) => {
    try {
      const deadLetter = await repository.findOne({
        where: { deadLetterId: req.params.deadLetterId }
      });

      if (!deadLetter) {
        res.status(404).json({
          success: false,
          error: '死信记录不存在'
        });
        return;
      }

      res.json({
        success: true,
        data: deadLetter
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
  '/:deadLetterId/requeue',
  requirePermission('deadletter:requeue'),
  async (req: Request, res: Response) => {
    try {
      const { note } = req.body;
      const task = await QueueService.requeueFromDeadLetter(
        req.params.deadLetterId,
        req.user!.userId,
        req.user!.userName,
        note
      );

      res.json({
        success: true,
        data: {
          message: '死信已重新入队',
          taskId: task.taskId
        }
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
  '/:deadLetterId/resolve',
  requirePermission('deadletter:requeue'),
  async (req: Request, res: Response) => {
    try {
      const { note } = req.body;
      const deadLetter = await QueueService.resolveDeadLetter(
        req.params.deadLetterId,
        req.user!.userId,
        req.user!.userName,
        note
      );

      res.json({
        success: true,
        data: deadLetter
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
  '/:deadLetterId/discard',
  requirePermission('deadletter:requeue'),
  async (req: Request, res: Response) => {
    try {
      const { note } = req.body;
      const deadLetter = await QueueService.discardDeadLetter(
        req.params.deadLetterId,
        req.user!.userId,
        req.user!.userName,
        note
      );

      res.json({
        success: true,
        data: deadLetter
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
