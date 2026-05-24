import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { exportService } from '../services';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const exportSchema = Joi.object({
  batchId: Joi.string().optional(),
  waveNos: Joi.array().items(Joi.string()).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  statuses: Joi.array().items(Joi.string()).optional(),
  includeHistory: Joi.boolean().default(false),
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
  '/',
  validate(exportSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const options = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      };

      const data = await exportService.export(
        options,
        req.user!.userId,
        req.user!.userName
      );

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/verify-consistency/:batchId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await exportService.verifyConsistency(req.params.batchId);

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
  '/retry-classification',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { batchId } = req.query;
      const result = await exportService.getRetryClassification(
        batchId as string
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
