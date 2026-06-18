import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/index.js';
import { recordTransition, canTransition, getNextStatus } from '../services/stateMachine.js';
import type { Anomaly, RecordStatus } from '../../shared/types.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { roundId } = req.query;
  if (!roundId) {
    res.status(400).json({ success: false, error: '缺少 roundId' });
    return;
  }
  const rows = db
    .prepare(
      `SELECT id, round_id as roundId, record_id as recordId, type, description, evidence,
              suggested_action as suggestedAction, interception_rule as interceptionRule,
              status, created_at as createdAt, updated_at as updatedAt
       FROM anomaly WHERE round_id = ? ORDER BY created_at DESC`,
    )
    .all(roundId) as Anomaly[];
  res.json({ success: true, data: rows });
});

router.put('/:id/status', (req: Request, res: Response) => {
  const db = getDb();
  const { id } = req.params;
  const { operator = '审计员', remark = '' } = req.body || {};
  const existing = db.prepare('SELECT * FROM anomaly WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ success: false, error: '异常不存在' });
    return;
  }
  const fromStatus = existing.status as RecordStatus;
  const toStatus = getNextStatus(fromStatus);
  if (!toStatus) {
    res.status(400).json({ success: false, error: '当前状态无法继续推进' });
    return;
  }
  if (!canTransition(fromStatus, toStatus)) {
    res.status(400).json({ success: false, error: '非法状态流转' });
    return;
  }
  const now = Date.now();
  db.prepare(`UPDATE anomaly SET status = ?, updated_at = ? WHERE id = ?`).run(toStatus, now, id);
  recordTransition({
    roundId: existing.round_id,
    entityType: 'anomaly',
    entityId: id,
    fromStatus,
    toStatus,
    operator,
    remark: remark || `状态推进：${fromStatus} → ${toStatus}`,
  });
  const updated = db
    .prepare(
      `SELECT id, round_id as roundId, record_id as recordId, type, description, evidence,
              suggested_action as suggestedAction, interception_rule as interceptionRule,
              status, created_at as createdAt, updated_at as updatedAt FROM anomaly WHERE id = ?`,
    )
    .get(id) as Anomaly;
  res.json({ success: true, data: updated });
});

router.post('/:id/supply-material', (req: Request, res: Response) => {
  const db = getDb();
  const { id } = req.params;
  const { operator = '审计员', material, workOrder = '' } = req.body || {};
  const existing = db.prepare('SELECT * FROM anomaly WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ success: false, error: '异常不存在' });
    return;
  }
  const now = Date.now();
  const toStatus: RecordStatus = 'reviewing';
  db.prepare(`UPDATE anomaly SET status = ?, updated_at = ? WHERE id = ?`).run(toStatus, now, id);
  recordTransition({
    roundId: existing.round_id,
    entityType: 'anomaly',
    entityId: id,
    fromStatus: existing.status as RecordStatus,
    toStatus,
    operator,
    remark: `补充材料：${material || '已提交'}${workOrder ? `，关联工单：${workOrder}` : ''}`,
  });

  if (existing.type === 'slow_query') {
    const suggestions = db
      .prepare(`SELECT id FROM index_suggestion WHERE round_id = ? AND is_active = 1`)
      .all(existing.round_id) as Array<{ id: string }>;
    for (const s of suggestions) {
      db.prepare(
        `UPDATE index_suggestion SET related_work_order = COALESCE(?, related_work_order), attribution_updated_at = ? WHERE id = ?`,
      ).run(workOrder || null, now, s.id);
    }
  }
  res.json({ success: true, data: { message: '材料已提交，索引归因已更新', workOrder } });
});

router.post('/:id/adjust-caliber', (req: Request, res: Response) => {
  const db = getDb();
  const { id } = req.params;
  const { operator = '审计员', reason = '' } = req.body || {};
  const existing = db.prepare('SELECT * FROM anomaly WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ success: false, error: '异常不存在' });
    return;
  }
  const now = Date.now();
  const toStatus: RecordStatus = 'reviewing';
  db.prepare(`UPDATE anomaly SET status = ?, updated_at = ? WHERE id = ?`).run(toStatus, now, id);
  recordTransition({
    roundId: existing.round_id,
    entityType: 'anomaly',
    entityId: id,
    fromStatus: existing.status as RecordStatus,
    toStatus,
    operator,
    remark: `调整口径：${reason || '已调整统计口径'}`,
  });
  res.json({ success: true, data: { message: '口径已调整' } });
});

export default router;
