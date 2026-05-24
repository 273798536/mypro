import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { deadLetterQueueService } from '../services';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const resolveSchema = Joi.object({
  resolution: Joi.string().required(),
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

router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit = 100, offset = 0, unresolved } = req.query;
      
      let result;
      if (unresolved === 'true') {
        const items = await deadLetterQueueService.getUnresolved(
          parseInt(limit as string)
        );
        result = { items, total: items.length };
      } else {
        result = await deadLetterQueueService.getAll(
          parseInt(limit as string),
          parseInt(offset as string)
        );
      }

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
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await deadLetterQueueService.getById(req.params.id);
      if (!item) {
        throw new AppError('死信项不存在', 404);
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

router.post(
  '/:id/resolve',
  validate(resolveSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await deadLetterQueueService.resolve(
        req.params.id,
        req.user!.userId,
        req.body.resolution,
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
  '/:id/retry',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const retryItem = await deadLetterQueueService.retry(
        req.params.id,
        req.user!.userId,
        req.user!.userName
      );

      res.json({
        success: true,
        data: {
          message: '已重新提交到重试队列',
          retryQueueId: retryItem.id,
        },
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
      const stats = await deadLetterQueueService.getStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
