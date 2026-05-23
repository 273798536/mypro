import { Router } from 'express';
import { auditService } from '../services/AuditService';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { page = 1, pageSize = 50, entityType, entityId, batchId } = req.query;
    const result = await auditService.getAuditTrails(
      entityType as any,
      entityId as string,
      batchId as string,
      Number(page),
      Number(pageSize)
    );

    res.json({
      success: true,
      data: result.data,
      total: result.total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
