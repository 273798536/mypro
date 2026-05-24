import { Router, Request, Response } from 'express';
import { requirePermission } from '../middleware/auth';
import { getAuditLogs, getFailedAuditLogs } from '../dao/auditLogDao';
import { maskAuditLog } from '../utils/maskUtils';
import { Role } from '../types';

const router = Router();

router.get('/', requirePermission('audit:read'), async (req: Request, res: Response) => {
  const { role } = req.auth!;
  const { userId, resourceType, success, startTime, endTime, limit, offset } = req.query;

  const logs = await getAuditLogs({
    userId: userId as string,
    resourceType: resourceType as string,
    success: success !== undefined ? success === 'true' : undefined,
    startTime: startTime as string,
    endTime: endTime as string,
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined
  });

  const maskedLogs = role === Role.ADMIN ? logs : logs.map(maskAuditLog);

  res.json({
    success: true,
    data: maskedLogs
  });
});

router.get('/failed', requirePermission('audit:read'), async (req: Request, res: Response) => {
  const { role } = req.auth!;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

  let logs = await getFailedAuditLogs(limit);
  logs = role === Role.ADMIN ? logs : logs.map(maskAuditLog);

  res.json({
    success: true,
    data: logs
  });
});

export default router;
