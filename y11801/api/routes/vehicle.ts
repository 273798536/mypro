import { Router, type Request, type Response } from 'express';
import { VehicleRepository } from '../repositories/VehicleRepository.js';
import { AuditService } from '../services/AuditService.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import type { ApiResponse, VehicleRecord } from '../../shared/types/index.js';

const router = Router();
const vehicleRepository = new VehicleRepository();
const auditService = new AuditService();

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const vehicle = vehicleRepository.findById(id);

    if (!vehicle) {
      throw new AppError('车辆记录不存在', 404);
    }

    const response: ApiResponse<VehicleRecord> = {
      success: true,
      data: vehicle,
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

    const existing = vehicleRepository.findById(id);
    if (!existing) {
      throw new AppError('车辆记录不存在', 404);
    }

    const updated = vehicleRepository.update(id, updateData);

    if (updated && reason) {
      const changes: Array<{
        fieldName: string;
        oldValue: unknown;
        newValue: unknown;
      }> = [];

      Object.entries(updateData).forEach(([key, value]) => {
        const existingValue = existing[key as keyof VehicleRecord];
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
          recordType: 'vehicle',
          fieldName: c.fieldName,
          oldValue: c.oldValue as string | number | boolean,
          newValue: c.newValue as string | number | boolean,
        })),
        operator,
        reason
      );
    }

    const response: ApiResponse<VehicleRecord> = {
      success: true,
      data: updated!,
      message: '车辆信息已更新',
    };

    res.status(200).json(response);
  })
);

export default router;
