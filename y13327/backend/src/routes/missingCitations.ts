import { Router, Request, Response } from 'express';
import db from '../database';
import type { MissingCitationRecord, CitationMissingReason } from '../types';

const router = Router();

function parseJson<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function detectCitationGaps(citationUrls: string[], content: string, expectedFields: string[] = []) {
  const missingItems: MissingCitationRecord['missing_items'] = [];

  if (!citationUrls || citationUrls.length === 0) {
    missingItems.push({
      field: '引用链接',
      expected: '至少1条有效引用来源',
      actual: null
    });
  }

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const contentUrls = content.match(urlRegex) || [];
  const validUrls = citationUrls.filter(u => 
    urlRegex.test(u) && !u.includes('example') && !u.includes('placeholder')
  );

  if (validUrls.length < citationUrls.length) {
    missingItems.push({
      field: '有效链接',
      expected: `${citationUrls.length}条均为有效`,
      actual: `仅${validUrls.length}条有效`
    });
  }

  expectedFields.forEach(field => {
    const fieldRegex = new RegExp(`[【\\[]${field}[】\\]]|${field}[:：]`);
    if (!fieldRegex.test(content)) {
      missingItems.push({
        field,
        expected: `包含「${field}」相关说明`,
        actual: `未找到「${field}」字段`
      });
    }
  });

  return missingItems;
}

router.post('/detect/:ticketId', (req: Request, res: Response) => {
  const { ticketId } = req.params;
  const { expectedFields = [] } = req.body;

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId) as any;
  if (!ticket) {
    return res.status(404).json({ message: '工单不存在' });
  }

  const citationUrls = parseJson<string[]>(ticket.citation_urls, []);
  const missingItems = detectCitationGaps(citationUrls, ticket.content, expectedFields);

  res.json({
    has_gap: missingItems.length > 0,
    missing_items: missingItems
  });
});

router.get('/ticket/:ticketId', (req: Request, res: Response) => {
  const { ticketId } = req.params;
  const row = db.prepare(`
    SELECT * FROM missing_citation_records 
    WHERE ticket_id = ? 
    ORDER BY created_at DESC 
    LIMIT 1
  `).get(ticketId) as any;

  if (!row) {
    return res.json(null);
  }

  const record: MissingCitationRecord = {
    id: row.id,
    ticket_id: row.ticket_id,
    missing_items: parseJson(row.missing_items, []),
    reason: row.reason as CitationMissingReason,
    reason_detail: row.reason_detail,
    impact_scope: parseJson(row.impact_scope, {
      affected_reports: [],
      affected_clusters: [],
      estimated_count: 0,
      severity: 'medium'
    }),
    confirmed: row.confirmed === 1,
    confirmed_by: row.confirmed_by,
    confirmed_at: row.confirmed_at,
    created_at: row.created_at
  };

  res.json(record);
});

router.post('/ticket/:ticketId', (req: Request, res: Response) => {
  const { ticketId } = req.params;
  const operator = req.headers['x-operator'] as string || 'system';
  const {
    missing_items,
    reason,
    reason_detail,
    impact_scope,
    auto_detect = true
  } = req.body;

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId) as any;
  if (!ticket) {
    return res.status(404).json({ message: '工单不存在' });
  }

  let finalMissingItems = missing_items;
  if (auto_detect) {
    const citationUrls = parseJson<string[]>(ticket.citation_urls, []);
    const detected = detectCitationGaps(citationUrls, ticket.content);
    finalMissingItems = Array.from(new Map([
      ...detected.map(i => [i.field, i]),
      ...(finalMissingItems || []).map((i: any) => [i.field, i])
    ]).values());
  }

  if (!finalMissingItems || finalMissingItems.length === 0) {
    return res.status(400).json({ message: '缺少缺失项明细' });
  }

  const defaultImpact = {
    affected_reports: [ticket.ticket_no],
    affected_clusters: [ticket.original_cluster],
    estimated_count: 1,
    severity: 'medium' as const
  };

  const info = db.prepare(`
    INSERT INTO missing_citation_records
    (ticket_id, missing_items, reason, reason_detail, impact_scope)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    parseInt(ticketId),
    JSON.stringify(finalMissingItems),
    reason || 'other',
    reason_detail || '',
    JSON.stringify({ ...defaultImpact, ...(impact_scope || {}) })
  );

  db.prepare(`
    UPDATE tickets 
    SET status = 'citation_missing', citation_status = 'missing', updated_at = datetime('now')
    WHERE id = ?
  `).run(parseInt(ticketId));

  const row = db.prepare('SELECT * FROM missing_citation_records WHERE id = ?').get(info.lastInsertRowid) as any;
  res.status(201).json({
    id: row.id,
    ticket_id: row.ticket_id,
    missing_items: parseJson(row.missing_items, []),
    reason: row.reason,
    reason_detail: row.reason_detail,
    impact_scope: parseJson(row.impact_scope, defaultImpact),
    confirmed: row.confirmed === 1,
    created_at: row.created_at
  });
});

router.put('/:id/confirm', (req: Request, res: Response) => {
  const { id } = req.params;
  const operator = req.headers['x-operator'] as string || 'system';

  const row = db.prepare('SELECT * FROM missing_citation_records WHERE id = ?').get(id) as any;
  if (!row) {
    return res.status(404).json({ message: '记录不存在' });
  }

  db.prepare(`
    UPDATE missing_citation_records
    SET confirmed = 1, confirmed_by = ?, confirmed_at = datetime('now')
    WHERE id = ?
  `).run(operator, parseInt(id));

  db.prepare(`
    UPDATE tickets SET status = 'pending', updated_at = datetime('now') WHERE id = ?
  `).run(row.ticket_id);

  res.json({ message: '已确认，工单状态恢复为待处理' });
});

router.get('/', (req: Request, res: Response) => {
  const rows = db.prepare(`
    SELECT mcr.*, t.ticket_no, t.title, t.status as ticket_status
    FROM missing_citation_records mcr
    LEFT JOIN tickets t ON mcr.ticket_id = t.id
    ORDER BY mcr.created_at DESC
    LIMIT 100
  `).all() as any[];

  res.json(rows.map(r => ({
    id: r.id,
    ticket_id: r.ticket_id,
    ticket_no: r.ticket_no,
    title: r.title,
    ticket_status: r.ticket_status,
    missing_items: parseJson(r.missing_items, []),
    reason: r.reason,
    reason_detail: r.reason_detail,
    impact_scope: parseJson(r.impact_scope, {}),
    confirmed: r.confirmed === 1,
    confirmed_by: r.confirmed_by,
    confirmed_at: r.confirmed_at,
    created_at: r.created_at
  })));
});

export default router;
