import { Router, type Request, type Response } from 'express';
import { AuditService } from '../services/AuditService.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import type { ApiResponse, AuditHistory } from '../../shared/types/index.js';

const router = Router();
const auditService = new AuditService();

router.get(
  '/:recordId',
  asyncHandler(async (req: Request, res: Response) => {
    const { recordId } = req.params;
    const { recordType } = req.query;

    const history = auditService.getHistory(
      recordId,
      recordType ? String(recordType) : undefined
    );

    const response: ApiResponse<AuditHistory[]> = {
      success: true,
      data: history,
    };

    res.status(200).json(response);
  })
);

export default router;
