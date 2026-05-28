import { Router, type Request, type Response } from 'express';
import { ContractRepository } from '../repositories/ContractRepository.js';
import { AuditService } from '../services/AuditService.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import type { ApiResponse, LoanContract } from '../../shared/types/index.js';

const router = Router();
const contractRepository = new ContractRepository();
const auditService = new AuditService();

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const contract = contractRepository.findById(id);

    if (!contract) {
      throw new AppError('合同记录不存在', 404);
    }

    const response: ApiResponse<LoanContract> = {
      success: true,
      data: contract,
    };

    res.status(200).json(response);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { operator, reason, ...updateData } = req.body;

    if (!operator) {
      throw new AppError('请提供操作人', 400);
    }

    const existing = contractRepository.findById(id);
    if (!existing) {
      throw new AppError('合同记录不存在', 404);
    }

    const updated = contractRepository.update(id, updateData);

    if (updated && reason) {
      const changes: Array<{
        fieldName: string;
        oldValue: unknown;
        newValue: unknown;
      }> = [];

      Object.entries(updateData).forEach(([key, value]) => {
        const existingValue = existing[key as keyof LoanContract];
        if (existingValue !== value) {
          changes.push({
            fieldName: key,
            oldValue: existingValue,
            newValue: value,
          });
        }
      });

      auditService.logChanges(
        changes.map(c => ({
          recordId: id,
          recordType: 'contract',
          fieldName: c.fieldName,
          oldValue: c.oldValue as string | number | boolean,
          newValue: c.newValue as string | number | boolean,
        })),
        operator,
        reason
      );
    }

    const response: ApiResponse<LoanContract> = {
      success: true,
      data: updated!,
      message: '合同信息已更新',
    };

    res.status(200).json(response);
  })
);

router.post(
  '/:id/subsidy-rollback',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rollbackAmount, reason, operator } = req.body;

    if (!rollbackAmount || rollbackAmount <= 0) {
      throw new AppError('请提供有效的回滚金额', 400);
    }

    if (!reason) {
      throw new AppError('请提供回滚原因', 400);
    }

    if (!operator) {
      throw new AppError('请提供操作人', 400);
    }

    const existing = contractRepository.findById(id);
    if (!existing) {
      throw new AppError('合同记录不存在', 404);
    }

    const updated = contractRepository.rollbackSubsidy(id, rollbackAmount, operator, reason);

    if (updated) {
      auditService.logChange(
        id,
        'contract',
        'clawbackAmount',
        existing.clawbackAmount || 0,
        (existing.clawbackAmount || 0) + rollbackAmount,
        operator,
        reason
      );

      auditService.logChange(
        id,
        'contract',
        'subsidyClawbackRequired',
        existing.subsidyClawbackRequired,
        true,
        operator,
        reason
      );
    }

    const response: ApiResponse<LoanContract> = {
      success: true,
      data: updated!,
      message: '补贴回滚成功',
    };

    res.status(200).json(response);
  })
);

export default router;
