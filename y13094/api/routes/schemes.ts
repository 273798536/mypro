import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';

const CONCLUSION_LABELS: Record<string, string> = {
  pending: '待定',
  approved: '通过',
  rejected: '否决',
  revised: '改判',
};

const router = Router();

function toChineseConclusion(c: string): string {
  return CONCLUSION_LABELS[c] || c;
}

router.get('/', (req: Request, res: Response) => {
  const { bridgeTunnelName, schemeType, conclusion, hasGap, dateFrom, dateTo } = req.query as Record<string, string>;

  let sql = 'SELECT * FROM schemes WHERE 1=1';
  const params: unknown[] = [];

  if (bridgeTunnelName) {
    sql += ' AND bridge_tunnel_name LIKE ?';
    params.push(`%${bridgeTunnelName}%`);
  }
  if (schemeType) {
    sql += ' AND scheme_type = ?';
    params.push(schemeType);
  }
  if (conclusion) {
    sql += ' AND conclusion = ?';
    params.push(conclusion);
  }
  if (hasGap !== undefined && hasGap !== '') {
    sql += ' AND has_gap = ?';
    params.push(hasGap === 'true' || hasGap === '1' ? 1 : 0);
  }
  if (dateFrom) {
    sql += ' AND created_at >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    sql += ' AND created_at <= ?';
    params.push(dateTo);
  }

  sql += ' ORDER BY updated_at DESC';

  const rows = db.prepare(sql).all(...params);

  const items = rows.map((row: Record<string, unknown>) => ({
    id: row.id,
    schemeNo: row.scheme_no,
    bridgeTunnelName: row.bridge_tunnel_name,
    pointCoord: row.point_coord,
    schemeType: row.scheme_type,
    conclusion: row.conclusion,
    hasGap: !!row.has_gap,
    supplementaryNote: row.supplementary_note || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  res.json({ items, total: items.length });
});

router.get('/:id', (req: Request, res: Response) => {
  const scheme = db.prepare('SELECT * FROM schemes WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!scheme) {
    res.status(404).json({ error: '方案不存在' });
    return;
  }

  const timeline = db.prepare('SELECT * FROM timeline_entries WHERE scheme_id = ? ORDER BY sort_order').all(scheme.id);
  const history = db.prepare('SELECT * FROM history_entries WHERE scheme_id = ? ORDER BY timestamp DESC').all(scheme.id);

  const detail = {
    id: scheme.id,
    schemeNo: scheme.scheme_no,
    bridgeTunnelName: scheme.bridge_tunnel_name,
    pointCoord: scheme.point_coord,
    schemeType: scheme.scheme_type,
    conclusion: scheme.conclusion,
    hasGap: !!scheme.has_gap,
    description: scheme.description,
    supplementaryNote: scheme.supplementary_note || '',
    finalConclusion: scheme.final_conclusion || '',
    createdAt: scheme.created_at,
    updatedAt: scheme.updated_at,
    timeline: timeline.map((t: Record<string, unknown>) => ({
      id: t.id,
      schemeId: t.scheme_id,
      timestamp: t.timestamp,
      event: t.event,
      isGap: !!t.is_gap,
      gapReason: t.gap_reason,
      sortOrder: t.sort_order,
    })),
    history: history.map((h: Record<string, unknown>) => ({
      id: h.id,
      schemeId: h.scheme_id,
      timestamp: h.timestamp,
      action: h.action,
      oldValue: h.old_value,
      newValue: h.new_value,
      reason: h.reason,
      operator: h.operator,
    })),
  };

  res.json(detail);
});

router.post('/:id/rejudge', (req: Request, res: Response) => {
  const { newConclusion, reason, operator } = req.body;
  const scheme = db.prepare('SELECT * FROM schemes WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!scheme) {
    res.status(404).json({ error: '方案不存在' });
    return;
  }

  const oldConclusion = scheme.conclusion as string;
  const finalConclusionText = `${toChineseConclusion(newConclusion)}——${reason}`;

  db.prepare('UPDATE schemes SET conclusion = ?, final_conclusion = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
    newConclusion,
    finalConclusionText,
    req.params.id
  );

  db.prepare('INSERT INTO history_entries (id, scheme_id, action, old_value, new_value, reason, operator) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    crypto.randomUUID(),
    req.params.id,
    'conclusion_change',
    toChineseConclusion(oldConclusion),
    toChineseConclusion(newConclusion),
    reason,
    operator
  );

  db.prepare('INSERT INTO timeline_entries (id, scheme_id, timestamp, event, is_gap, sort_order) VALUES (?, ?, datetime(\'now\'), ?, 0, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM timeline_entries WHERE scheme_id = ?))').run(
    crypto.randomUUID(),
    req.params.id,
    `改判：${toChineseConclusion(oldConclusion)} → ${toChineseConclusion(newConclusion)}`,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM schemes WHERE id = ?').get(req.params.id) as Record<string, unknown>;
  res.json({
    id: updated.id,
    schemeNo: updated.scheme_no,
    conclusion: updated.conclusion,
    finalConclusion: updated.final_conclusion,
    updatedAt: updated.updated_at,
  });
});

router.put('/:id/note', (req: Request, res: Response) => {
  const { supplementaryNote, operator } = req.body;
  const scheme = db.prepare('SELECT * FROM schemes WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!scheme) {
    res.status(404).json({ error: '方案不存在' });
    return;
  }

  const oldNote = (scheme.supplementary_note as string) || '';

  db.prepare('UPDATE schemes SET supplementary_note = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
    supplementaryNote,
    req.params.id
  );

  db.prepare('INSERT INTO history_entries (id, scheme_id, action, old_value, new_value, reason, operator) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    crypto.randomUUID(),
    req.params.id,
    'note_update',
    oldNote,
    supplementaryNote,
    '更新后补备注',
    operator
  );

  res.json({ success: true });
});

export default router;
