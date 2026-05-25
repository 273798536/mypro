import { Router, Request, Response } from 'express';
import { CompensationService } from '../services/CompensationService';
import { CompensationType } from '../entities/CompensationRecord';
import { requirePermission } from '../middleware/auth';

const router = Router();

router.post(
  '/',
  requirePermission('application:submit'),
  async (req: Request, res: Response) => {
    try {
      const { applicationId, compensationType, amount, reason, evidence } = req.body;
      
      if (!applicationId || !compensationType || amount === undefined) {
        res.status(400).json({
          success: false,
          error: '缺少必要参数: applicationId, compensationType, amount'
        });
        return;
      }

      const record = await CompensationService.createCompensationRecord(
        {
          applicationId,
          compensationType: compensationType as CompensationType,
          amount: parseFloat(amount),
          reason,
          evidence
        },
        req.user?.userId,
        req.user?.userName
      );

      res.json({
        success: true,
        data: record
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

router.get(
  '/application/:applicationId',
  requirePermission('application:view'),
  async (req: Request, res: Response) => {
    try {
      const records = await CompensationService.getCompensationRecordsByApplication(
        req.params.applicationId
      );

      res.json({
        success: true,
        data: records
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

router.get(
  '/:id',
  requirePermission('application:view'),
  async (req: Request, res: Response) => {
    try {
      const record = await CompensationService.getCompensationRecordById(req.params.id);

      res.json({
        success: true,
        data: record
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }
);

router.post(
  '/:id/confirm',
  requirePermission('application:close'),
  async (req: Request, res: Response) => {
    try {
      const record = await CompensationService.confirmCompensation(
        req.params.id,
        req.user!.userId,
        req.user!.userName
      );

      res.json({
        success: true,
        data: record
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
  '/:id/pay',
  requirePermission('application:close'),
  async (req: Request, res: Response) => {
    try {
      const { amount, paymentMethod, paymentReference } = req.body;
      
      if (!amount || !paymentMethod) {
        res.status(400).json({
          success: false,
          error: '缺少必要参数: amount, paymentMethod'
        });
        return;
      }

      const record = await CompensationService.processPayment(
        {
          recordId: req.params.id,
          amount: parseFloat(amount),
          paymentMethod,
          paymentReference
        },
        req.user!.userId,
        req.user!.userName
      );

      res.json({
        success: true,
        data: record
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
  '/:id/waive',
  requirePermission('application:close'),
  async (req: Request, res: Response) => {
    try {
      const { reason } = req.body;
      
      const record = await CompensationService.waiveCompensation(
        req.params.id,
        reason || '主管豁免',
        req.user!.userId,
        req.user!.userName
      );

      res.json({
        success: true,
        data: record
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
