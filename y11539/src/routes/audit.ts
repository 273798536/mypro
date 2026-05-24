import { Router, Request, Response } from 'express';
import { AuditService } from '../services/audit-service';

const router = Router();

router.get('/batch/:batchId/changes', async (req: Request, res: Response) => {
  try {
    const history = await AuditService.getBatchChangeHistory(req.params.batchId);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/batch/:batchId/transitions', async (req: Request, res: Response) => {
  try {
    const transitions = await AuditService.getBatchStatusTransitions(req.params.batchId);
    res.json(transitions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/changes', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;

    const result = await AuditService.getAllChangeHistory(page, pageSize);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
