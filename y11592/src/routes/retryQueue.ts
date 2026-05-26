import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { DataSourceType, IdempotencyStrategy, RetryStatus } from '../types';
import { retryQueueService } from '../services';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const submitSchema = Joi.object({
  sourceType: Joi.string()
    .valid(...Object.values(DataSourceType))
    .required(),
  sourceId: Joi.string().required(),
  sourceData: Joi.object().required(),
  idempotencyStrategy: Joi.string()
    .valid(...Object.values(IdempotencyStrategy))
    .default(IdempotencyStrategy.IGNORE),
  batchId: Joi.string().optional(),
  maxAttempts: Joi.number().integer().min(1).optional(),
});

const manualDecisionSchema = Joi.object({
  decision: Joi.string().valid('approve', 'reject', 'retry').required(),
  note: Joi.string().required(),
});

const freezeSchema = Joi.object({
  reason: Joi.string().required(),
});

const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }
    next();
  };
};

router.post(
  '/submit',
  validate(submitSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await retryQueueService.submit({
        ...req.body,
        submittedBy: req.user!.userId,
        submittedByName: req.user!.userName,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/batch-submit',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { items, batchId } = req.body;
      
      if (!Array.isArray(items) || items.length === 0) {
        throw new AppError('items 必须是非空数组', 400);
      }

      const results = [];
      let successCount = 0;
      let failedCount = 0;

      for (const item of items) {
        try {
          const result = await retryQueueService.submit({
            ...item,
            batchId: batchId || item.batchId,
            submittedBy: req.user!.userId,
            submittedByName: req.user!.userName,
          });
          results.push({ ...result, item });
          if (result.success) successCount++;
          else failedCount++;
        } catch (error: any) {
          results.push({
            success: false,
            action: 'error',
            message: error.message,
            item,
          });
          failedCount++;
        }
      }

      res.json({
        success: true,
        data: {
          total: items.length,
          success: successCount,
          failed: failedCount,
          results,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/trigger-process',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await retryQueueService.processPendingItems();

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/statistics/summary',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await retryQueueService.getStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, batchId, limit = 100 } = req.query;
      
      let items;
      if (status) {
        items = await retryQueueService.getByStatus(
          status as RetryStatus,
          parseInt(limit as string)
        );
      } else if (batchId) {
        items = await retryQueueService.getByBatchId(batchId as string);
      } else {
        items = await retryQueueService.getByStatus(
          RetryStatus.PENDING,
          parseInt(limit as string)
        );
      }

      res.json({
        success: true,
        data: items,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/cancel',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await retryQueueService.cancel(
        req.params.id,
        req.user!.userId,
        req.user!.userName
      );

      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/freeze',
  validate(freezeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await retryQueueService.freeze(
        req.params.id,
        req.user!.userId,
        req.body.reason,
        req.user!.userName
      );

      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/unfreeze',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await retryQueueService.unfreeze(
        req.params.id,
        req.user!.userId,
        req.user!.userName
      );

      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/manual-decision',
  validate(manualDecisionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await retryQueueService.manualDecision(
        req.params.id,
        req.user!.userId,
        req.body.decision,
        req.body.note,
        req.user!.userName
      );

      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await retryQueueService.getById(req.params.id);
      if (!item) {
        throw new AppError('重试项不存在', 404);
      }

      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
