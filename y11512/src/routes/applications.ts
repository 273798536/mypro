import { Router, Request, Response } from 'express';
import { BorrowApplicationService, DuplicateHandling } from '../services/BorrowApplicationService';
import { requirePermission } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.post(
  '/submit',
  requirePermission('application:submit'),
  async (req: Request, res: Response) => {
    try {
      const { data, duplicateStrategy = 'append' } = req.body;
      
      if (!data || !data.applicationNo) {
        res.status(400).json({
          success: false,
          error: '缺少申请编号'
        });
        return;
      }

      const duplicateHandling: DuplicateHandling = {
        strategy: duplicateStrategy
      };

      const result = await BorrowApplicationService.submitApplication(
        data,
        duplicateHandling,
        req.user?.userId,
        req.user?.userName
      );

      res.json({
        success: true,
        data: {
          application: result.application,
          isNew: result.isNew,
          action: result.action
        }
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
  '/batch-submit',
  requirePermission('application:submit'),
  async (req: Request, res: Response) => {
    try {
      const { applications, duplicateStrategy = 'append' } = req.body;
      
      if (!Array.isArray(applications)) {
        res.status(400).json({
          success: false,
          error: '申请列表格式错误'
        });
        return;
      }

      const batchId = uuidv4();
      const duplicateHandling: DuplicateHandling = {
        strategy: duplicateStrategy as any
      };

      const result = await BorrowApplicationService.batchSubmit(
        applications,
        duplicateHandling,
        batchId,
        req.user?.userId,
        req.user?.userName
      );

      res.json({
        success: true,
        data: {
          batchId,
          total: applications.length,
          ...result
        }
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
  '/:id/withdraw',
  requirePermission('application:withdraw'),
  async (req: Request, res: Response) => {
    try {
      const { reason } = req.body;
      const application = await BorrowApplicationService.withdrawApplication(
        req.params.id,
        reason || '用户撤回',
        req.user!.userId,
        req.user!.userName
      );

      res.json({
        success: true,
        data: application
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
  '/:id/resubmit',
  requirePermission('application:submit'),
  async (req: Request, res: Response) => {
    try {
      const application = await BorrowApplicationService.resubmitAfterWithdraw(
        req.params.id,
        req.user!.userId,
        req.user!.userName
      );

      res.json({
        success: true,
        data: application
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
  '/:id/close',
  requirePermission('application:close'),
  async (req: Request, res: Response) => {
    try {
      const { reason } = req.body;
      const application = await BorrowApplicationService.closeApplication(
        req.params.id,
        reason || '正常关闭',
        req.user!.userId,
        req.user!.userName
      );

      res.json({
        success: true,
        data: application
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
      const details = await BorrowApplicationService.getApplicationWithDetails(req.params.id);
      res.json({
        success: true,
        data: details
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
  '/:id/comments',
  requirePermission('comment:add'),
  async (req: Request, res: Response) => {
    try {
      const { commentType, content, isDecision = false, changes } = req.body;
      
      const comment = await BorrowApplicationService.addSupervisorComment(
        req.params.id,
        commentType,
        content,
        req.user!.userId,
        req.user!.userName,
        isDecision,
        changes
      );

      res.json({
        success: true,
        data: comment
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
