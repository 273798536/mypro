import { Router, Request, Response } from 'express';
import { ExpressOrderService } from '../services/ExpressOrderService';
import { ExpressType, ExpressStatus } from '../entities/ExpressOrder';
import { requirePermission } from '../middleware/auth';

const router = Router();

router.post(
  '/',
  requirePermission('application:submit'),
  async (req: Request, res: Response) => {
    try {
      const data = req.body;
      
      if (!data.expressNo || !data.applicationId || !data.courierCompany) {
        res.status(400).json({
          success: false,
          error: '缺少必要参数: expressNo, applicationId, courierCompany'
        });
        return;
      }

      const order = await ExpressOrderService.createExpressOrder(
        {
          ...data,
          expressType: data.expressType as ExpressType || ExpressType.FORWARD
        },
        req.user?.userId,
        req.user?.userName
      );

      res.json({
        success: true,
        data: order
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
      const orders = await ExpressOrderService.getExpressOrdersByApplication(
        req.params.applicationId
      );

      res.json({
        success: true,
        data: orders
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
      const order = await ExpressOrderService.getExpressOrderById(req.params.id);

      res.json({
        success: true,
        data: order
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
  '/:id/status',
  requirePermission('application:submit'),
  async (req: Request, res: Response) => {
    try {
      const { status, trackingInfo } = req.body;
      
      if (!status) {
        res.status(400).json({
          success: false,
          error: '缺少状态参数'
        });
        return;
      }

      const order = await ExpressOrderService.updateExpressStatus(
        req.params.id,
        status as ExpressStatus,
        trackingInfo,
        req.user?.userId,
        req.user?.userName
      );

      res.json({
        success: true,
        data: order
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
