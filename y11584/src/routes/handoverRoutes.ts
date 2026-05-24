import { Router, Request, Response } from 'express';
import {
  createHandoverRecord,
  updateHandoverStatus,
  getHandoverById,
  getHandoverList
} from '../services/handoverService';
import { getAuditTrailsByRecord } from '../services/auditService';
import { exportHandoverToCSV } from '../services/exportService';
import { RecordType, RoleType } from '../database/schema';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { operator, ...data } = req.body;
    if (!operator || !operator.id || !operator.role) {
      return res.status(400).json({ error: '缺少操作人信息' });
    }

    const result = await createHandoverRecord(data, operator);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, operator, changeReason } = req.body;

    if (!operator || !operator.id || !operator.role) {
      return res.status(400).json({ error: '缺少操作人信息' });
    }
    if (!action || !changeReason) {
      return res.status(400).json({ error: '缺少操作类型或变更原因' });
    }

    const result = await updateHandoverStatus(id, action, operator, changeReason);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const record = await getHandoverById(req.params.id);
    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }
    res.json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { storeId, status, startTime, endTime, limit, offset } = req.query;
    const records = await getHandoverList({
      storeId: storeId as string,
      status: status as any,
      startTime: startTime ? parseInt(startTime as string) : undefined,
      endTime: endTime ? parseInt(endTime as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });
    res.json(records);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id/audit-trails', async (req: Request, res: Response) => {
  try {
    const trails = await getAuditTrailsByRecord(req.params.id, RecordType.HANDOVER);
    res.json(trails);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/export/csv', async (req: Request, res: Response) => {
  try {
    const { role, storeId, status, startTime, endTime } = req.query;
    if (!role) {
      return res.status(400).json({ error: '缺少角色信息' });
    }

    const csv = await exportHandoverToCSV(role as RoleType, {
      storeId: storeId as string,
      status: status as any,
      startTime: startTime ? parseInt(startTime as string) : undefined,
      endTime: endTime ? parseInt(endTime as string) : undefined
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="store_handovers.csv"');
    res.send('\uFEFF' + csv);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
