import { Router } from 'express';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth';
import { auditLogService } from '../services/AuditLogService';
import { ActionType } from '../types';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission('audit:read'),
  async (req: AuthRequest, res) => {
    try {
      const {
        resourceType, resourceId, userId, actionType,
        startTime, endTime, page, pageSize
      } = req.query;

      const result = await auditLogService.getAuditLogs({
        resourceType: resourceType as string,
        resourceId: resourceId as string,
        userId: userId as string,
        actionType: actionType as ActionType,
        startTime: startTime ? new Date(startTime as string) : undefined,
        endTime: endTime ? new Date(endTime as string) : undefined,
        page: page ? parseInt(page as string) : 1,
        pageSize: pageSize ? parseInt(pageSize as string) : 50
      });

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.get(
  '/permission-denied',
  requirePermission('audit:read'),
  async (req: AuthRequest, res) => {
    try {
      const { startTime, endTime, page, pageSize } = req.query;

      const result = await auditLogService.getPermissionDeniedLogs({
        startTime: startTime ? new Date(startTime as string) : undefined,
        endTime: endTime ? new Date(endTime as string) : undefined,
        page: page ? parseInt(page as string) : 1,
        pageSize: pageSize ? parseInt(pageSize as string) : 50
      });

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;
