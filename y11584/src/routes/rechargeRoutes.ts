import { Router, Request, Response } from 'express';
import {
  createRechargeRecord,
  updateRechargeStatus,
  getRechargeById,
  getRechargeByOrderNo,
  getRechargeList,
  getRechargeSummary
} from '../services/rechargeService';
import { getAuditTrailsByRecord } from '../services/auditService';
import { exportRechargeToCSV } from '../services/exportService';
import { RecordType, RoleType } from '../database/schema';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { operator, ...data } = req.body;
    if (!operator || !operator.id || !operator.role) {
      return res.status(400).json({ error: '缺少操作人信息' });
    }

    const result = await createRechargeRecord(data, operator);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, operator, changeReason, reviewRemark } = req.body;

    if (!operator || !operator.id || !operator.role) {
      return res.status(400).json({ error: '缺少操作人信息' });
    }
    if (!action || !changeReason) {
      return res.status(400).json({ error: '缺少操作类型或变更原因' });
    }

    const result = await updateRechargeStatus(
      id,
      action,
      operator,
      changeReason,
      reviewRemark
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const record = await getRechargeById(req.params.id);
    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }
    res.json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/order/:orderNo', async (req: Request, res: Response) => {
  try {
    const record = await getRechargeByOrderNo(req.params.orderNo);
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
    const { storeId, memberId, status, startTime, endTime, limit, offset } = req.query;
    const records = await getRechargeList({
      storeId: storeId as string,
      memberId: memberId as string,
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

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { storeId, startTime, endTime } = req.query;
    const summary = await getRechargeSummary({
      storeId: storeId as string,
      startTime: startTime ? parseInt(startTime as string) : undefined,
      endTime: endTime ? parseInt(endTime as string) : undefined
    });
    res.json(summary);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id/audit-trails', async (req: Request, res: Response) => {
  try {
    const trails = await getAuditTrailsByRecord(req.params.id, RecordType.RECHARGE);
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

    const csv = await exportRechargeToCSV(role as RoleType, {
      storeId: storeId as string,
      status: status as any,
      startTime: startTime ? parseInt(startTime as string) : undefined,
      endTime: endTime ? parseInt(endTime as string) : undefined
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="recharge_records.csv"');
    res.send('\uFEFF' + csv);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
