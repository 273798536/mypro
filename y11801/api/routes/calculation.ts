import { Router, type Request, type Response } from 'express';
import { CalculationService } from '../services/CalculationService.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import type {
  ApiResponse,
  CalculationResult,
  GetResultsFilters,
  PaginationParams,
  PaginatedResponse,
} from '../../shared/types/index.js';

const router = Router();
const calculationService = new CalculationService();

router.get(
  '/results',
  asyncHandler(async (req: Request, res: Response) => {
    const filters: GetResultsFilters = {};

    if (req.query.status) {
      filters.status = req.query.status as GetResultsFilters['status'];
    }
    if (req.query.storeId) {
      filters.storeId = req.query.storeId as string;
    }
    if (req.query.brand) {
      filters.brand = req.query.brand as string;
    }
    if (req.query.startDate) {
      filters.startDate = req.query.startDate as string;
    }
    if (req.query.endDate) {
      filters.endDate = req.query.endDate as string;
    }

    const pagination: PaginationParams = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
    };

    const result = calculationService.getResults(filters, pagination);

    const response: ApiResponse<
      PaginatedResponse<CalculationResult> & {
        summary: {
          readyCount: number;
          needConfirmCount: number;
          cannotCalculateCount: number;
          totalReceivable: number;
          totalPayable: number;
        };
      }
    > = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  })
);

router.get(
  '/results/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = calculationService.getResultDetail(id);

    if (!result) {
      throw new AppError('试算结果不存在', 404);
    }

    const response: ApiResponse<CalculationResult> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  })
);

router.post(
  '/recalculate/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason, operator } = req.body;

    if (!reason) {
      throw new AppError('请提供重算原因', 400);
    }

    if (!operator) {
      throw new AppError('请提供操作人', 400);
    }

    const result = calculationService.recalculate(id, reason, operator);

    if (!result) {
      throw new AppError('试算记录不存在', 404);
    }

    const response: ApiResponse<CalculationResult> = {
      success: true,
      data: result,
      message: '余额重算完成',
    };

    res.status(200).json(response);
  })
);

export default router;
