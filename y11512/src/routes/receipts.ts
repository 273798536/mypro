import { Router, Request, Response } from 'express';
import { ReceiptService } from '../services/ReceiptService';
import { requirePermission } from '../middleware/auth';

const router = Router();

router.post(
  '/',
  requirePermission('application:submit'),
  async (req: Request, res: Response) => {
    try {
      const { applicationNo, receiptType, externalReference, timestamp, data } = req.body;
      
      if (!applicationNo || !receiptType || !externalReference) {
        res.status(400).json({
          success: false,
          error: '缺少必要参数: applicationNo, receiptType, externalReference'
        });
        return;
      }

      const result = await ReceiptService.submitExternalReceipt({
        applicationNo,
        receiptType,
        externalReference,
        timestamp: timestamp || new Date().toISOString(),
        data: data || {},
        operatorId: req.user?.userId,
        operatorName: req.user?.userName
      });

      res.json({
        success: true,
        data: result
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
  '/process/:applicationId',
  requirePermission('application:close'),
  async (req: Request, res: Response) => {
    try {
      const { payload } = req.body;
      
      if (!payload || !payload.receiptType) {
        res.status(400).json({
          success: false,
          error: '缺少必要参数: payload.receiptType'
        });
        return;
      }

      const result = await ReceiptService.processReceiptPayload(
        req.params.applicationId,
        payload,
        req.user?.userId,
        req.user?.userName
      );

      res.json({
        success: result.success,
        data: result
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
  '/calculate-fees/:applicationId',
  requirePermission('application:close'),
  async (req: Request, res: Response) => {
    try {
      const result = await ReceiptService.calculateAndRecordFees(
        req.params.applicationId,
        req.user!.userId,
        req.user!.userName
      );

      res.json({
        success: result.success,
        data: result
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
