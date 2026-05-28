import { Router, type Request, type Response } from 'express';
import { PendingService } from '../services/PendingService.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import type { ApiResponse, PendingItem, PendingType } from '../../shared/types/index.js';

const router = Router();
const pendingService = new PendingService();

router.get(
  '/items',
  asyncHandler(async (req: Request, res: Response) => {
    const filters: {
      status?: PendingItem['status'];
      type?: PendingType;
      level?: PendingItem['level'];
    } = {};

    if (req.query.status) {
      filters.status = req.query.status as PendingItem['status'];
    }
    if (req.query.type) {
      filters.type = req.query.type as PendingType;
    }
    if (req.query.level) {
      filters.level = req.query.level as PendingItem['level'];
    }

    const items = pendingService.getPendingItems(filters);

    const response: ApiResponse<PendingItem[]> = {
      success: true,
      data: items,
    };

    res.status(200).json(response);
  })
);

router.put(
  '/:id/confirm',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { operator, note } = req.body;

    if (!operator) {
      throw new AppError('请提供操作人', 400);
    }

    const result = pendingService.confirmItem(id, operator, note);

    if (!result) {
      throw new AppError('待确认项不存在', 404);
    }

    const response: ApiResponse<PendingItem> = {
      success: true,
      data: result,
      message: '确认成功',
    };

    res.status(200).json(response);
  })
);

router.put(
  '/batch-confirm',
  asyncHandler(async (req: Request, res: Response) => {
    const { ids, operator, note } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new AppError('请选择要确认的待办项', 400);
    }

    if (!operator) {
      throw new AppError('请提供操作人', 400);
    }

    const count = pendingService.batchConfirm(ids, operator, note);

    const response: ApiResponse<{ confirmed: number }> = {
      success: true,
      data: { confirmed: count },
      message: `已确认 ${count} 条待办项`,
    };

    res.status(200).json(response);
  })
);

export default router;
