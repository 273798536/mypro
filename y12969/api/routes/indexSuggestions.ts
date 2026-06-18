import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/index.js';
import type { IndexSuggestion } from '../../shared/types.js';

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
      `SELECT id, round_id as roundId, table_name as tableName, suggested_index as suggestedIndex,
              reason, expected_benefit as expectedBenefit, priority,
              related_work_order as relatedWorkOrder, is_active as isActive,
              attribution_updated_at as attributionUpdatedAt, created_at as createdAt
       FROM index_suggestion WHERE round_id = ? ORDER BY
         CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC`,
    )
    .all(roundId) as IndexSuggestion[];
  const mapped = rows.map((r) => ({
    ...r,
    isActive: Boolean(r.isActive),
  }));
  res.json({ success: true, data: mapped });
});

router.post('/:id/reattribute', (req: Request, res: Response) => {
  const db = getDb();
  const { id } = req.params;
  const { operator = '审计员', workOrder, extraReason = '' } = req.body || {};
  const existing = db.prepare('SELECT * FROM index_suggestion WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ success: false, error: '索引建议不存在' });
    return;
  }
  const now = Date.now();
  const newReason =
    existing.reason +
    (extraReason ? `；[归因更新 ${new Date(now).toLocaleString()}] ${extraReason}` : '') +
    (workOrder ? `；[关联工单] ${workOrder}` : '');

  db.prepare(
    `UPDATE index_suggestion SET reason = ?, related_work_order = COALESCE(?, related_work_order), attribution_updated_at = ? WHERE id = ?`,
  ).run(newReason, workOrder || null, now, id);

  const updated = db
    .prepare(
      `SELECT id, round_id as roundId, table_name as tableName, suggested_index as suggestedIndex,
              reason, expected_benefit as expectedBenefit, priority,
              related_work_order as relatedWorkOrder, is_active as isActive,
              attribution_updated_at as attributionUpdatedAt, created_at as createdAt
       FROM index_suggestion WHERE id = ?`,
    )
    .get(id) as IndexSuggestion;
  res.json({
    success: true,
    data: {
      ...updated,
      isActive: Boolean(updated.isActive),
      attributionBefore: existing.reason,
      attributionAfter: newReason,
    },
  });
});

export default router;
