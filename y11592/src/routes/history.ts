import { Router, Request, Response, NextFunction } from 'express';
import { operationLogService } from '../services';
import { OperationType } from '../types';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.get(
  '/entity/:entityType/:entityId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityType, entityId } = req.params;
      const logs = await operationLogService.getEntityHistory(
        entityType as any,
        entityId
      );

      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/batch/:batchId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const logs = await operationLogService.getBatchHistory(
        req.params.batchId
      );

      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/operator/:operatorId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit = 100 } = req.query;
      const logs = await operationLogService.getOperatorHistory(
        req.params.operatorId,
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/operation/:operationType',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { operationType } = req.params;
      const { limit = 100 } = req.query;
      
      if (!Object.values(OperationType).includes(operationType as OperationType)) {
        throw new AppError(`无效的操作类型: ${operationType}`, 400);
      }

      const logs = await operationLogService.getOperationTypeHistory(
        operationType as OperationType,
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
