import { Router } from 'express';
import { db } from '../repository/db';
import type {
  UpdateRemarkRequest, WithdrawRequest, SupplementRequest, BadDataRequest,
} from '../../shared/types';

const router = Router();

router.get('/', (req, res) => {
  const { region, type, status, includeWithdrawn } = req.query;
  let points = db.getAllPoints();
  if (region) {
    const r = String(region).toUpperCase();
    points = points.filter(p => p.cabinetId.includes(`-${r}-`));
  }
  if (type) {
    const ts = String(type).split(',');
    points = points.filter(p => ts.includes(p.type));
  }
  if (status) {
    const ss = String(status).split(',');
    points = points.filter(p => ss.includes(p.status));
  }
  if (includeWithdrawn !== 'true') {
    points = points.filter(p => !p.withdrawn);
  }
  res.json(points);
});

router.get('/:id', (req, res) => {
  const p = db.getPointById(req.params.id);
  if (!p) return res.status(404).json({ error: 'Point not found' });
  res.json(p);
});

router.patch('/:id', (req, res) => {
  const updated = db.updatePoint(req.params.id, req.body ?? {});
  if (!updated) return res.status(404).json({ error: 'Point not found' });
  res.json(updated);
});

router.patch('/:id/remark', (req, res) => {
  const body = req.body as UpdateRemarkRequest;
  if (typeof body?.remark !== 'string') {
    return res.status(400).json({ error: 'remark is required' });
  }
  const updated = db.updatePoint(req.params.id, { remark: body.remark });
  if (!updated) return res.status(404).json({ error: 'Point not found' });
  res.json(updated);
});

router.post('/:id/withdraw', (req, res) => {
  const body = req.body as WithdrawRequest;
  if (!body?.reason || !body?.operator) {
    return res.status(400).json({ error: 'reason and operator are required' });
  }
  const updated = db.updatePoint(req.params.id, {
    withdrawn: true,
    withdrawalInfo: { reason: body.reason, operator: body.operator, timestamp: Date.now() },
  });
  if (!updated) return res.status(404).json({ error: 'Point not found' });
  res.json(updated);
});

router.post('/:id/supplement', (req, res) => {
  const body = req.body as SupplementRequest;
  if (!body?.content || !body?.operator) {
    return res.status(400).json({ error: 'content and operator are required' });
  }
  const current = db.getPointById(req.params.id);
  if (!current) return res.status(404).json({ error: 'Point not found' });
  const supplement = {
    id: `S-${String(current.supplements.length + 1).padStart(3, '0')}`,
    content: body.content,
    operator: body.operator,
    timestamp: Date.now(),
  };
  const updated = db.updatePoint(req.params.id, {
    supplements: [...current.supplements, supplement],
  });
  res.json(updated);
});

router.post('/:id/bad-data', (req, res) => {
  const body = req.body as BadDataRequest;
  if (!body?.reason || typeof body.originalRow !== 'number') {
    return res.status(400).json({ error: 'reason and originalRow are required' });
  }
  const updated = db.updatePoint(req.params.id, {
    isBadData: true,
    badDataReason: body.reason,
    originalRow: body.originalRow,
  });
  if (!updated) return res.status(404).json({ error: 'Point not found' });
  res.json(updated);
});

export default router;
