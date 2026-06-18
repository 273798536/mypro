import { Router, Request, Response } from 'express';
import db from '../database';
import type { Ticket, ReviewRecord, HistoryVersion } from '../types';

const router = Router();

function parseJson<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function serializeTicket(row: any): Ticket {
  return {
    ...row,
    citation_urls: parseJson<string[]>(row.citation_urls, [])
  };
}

router.get('/', (req: Request, res: Response) => {
  const { status, keyword, page = '1', pageSize = '20' } = req.query;
  let sql = 'SELECT * FROM tickets WHERE 1=1';
  const params: any[] = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (keyword) {
    sql += ' AND (title LIKE ? OR ticket_no LIKE ? OR content LIKE ?)';
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }

  sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
  const limit = parseInt(pageSize as string);
  const offset = (parseInt(page as string) - 1) * limit;
  params.push(limit, offset);

  const rows = db.prepare(sql).all(...params) as any[];
  
  let countSql = 'SELECT COUNT(*) as total FROM tickets WHERE 1=1';
  const countParams: any[] = [];
  if (status) {
    countSql += ' AND status = ?';
    countParams.push(status);
  }
  if (keyword) {
    countSql += ' AND (title LIKE ? OR ticket_no LIKE ? OR content LIKE ?)';
    const kw = `%${keyword}%`;
    countParams.push(kw, kw, kw);
  }
  const { total } = db.prepare(countSql).get(...countParams) as any;

  res.json({
    data: rows.map(serializeTicket),
    total: total as number,
    page: parseInt(page as string),
    pageSize: limit
  });
});

router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const row = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id) as any;
  if (!row) {
    return res.status(404).json({ message: '工单不存在' });
  }
  res.json(serializeTicket(row));
});

router.post('/', (req: Request, res: Response) => {
  const {
    ticket_no, title, original_cluster, content,
    citation_urls = [], citation_status = 'complete'
  } = req.body;

  if (!ticket_no || !title || !original_cluster) {
    return res.status(400).json({ message: '缺少必要字段' });
  }

  try {
    const info = db.prepare(`
      INSERT INTO tickets (ticket_no, title, original_cluster, content, citation_urls, citation_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      ticket_no, title, original_cluster, content || '',
      JSON.stringify(citation_urls), citation_status
    );

    const row = db.prepare('SELECT * FROM tickets WHERE id = ?').get(info.lastInsertRowid) as any;
    res.status(201).json(serializeTicket(row));
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
});

function recordHistory(
  ticketId: number,
  fieldName: string,
  oldVal: string,
  newVal: string,
  changedBy: string,
  changeNote: string,
  oldScreenshotRefs: string[] = []
) {
  const { maxVersion } = db.prepare(
    'SELECT COALESCE(MAX(version), 0) as maxVersion FROM history_versions WHERE ticket_id = ?'
  ).get(ticketId) as any;

  db.prepare(`
    INSERT INTO history_versions 
    (ticket_id, version, field_name, old_value, new_value, changed_by, change_note, old_screenshot_refs)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    ticketId, maxVersion + 1, fieldName, oldVal, newVal,
    changedBy, changeNote, JSON.stringify(oldScreenshotRefs)
  );
}

router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const operator = req.headers['x-operator'] as string || 'system';
  const { title, final_cluster, status, citation_urls, citation_status, content, change_note } = req.body;

  const existing = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ message: '工单不存在' });
  }

  const updates: string[] = [];
  const params: any[] = [];

  const fieldsToCheck: { [key: string]: { newVal?: any; label: string; getOld: (r: any) => string; convertNew?: (v: any) => string } } = {
    title: { newVal: title, label: '标题', getOld: r => r.title },
    final_cluster: { newVal: final_cluster, label: '最终聚类', getOld: r => r.final_cluster || '' },
    status: { newVal: status, label: '状态', getOld: r => r.status },
    citation_status: { newVal: citation_status, label: '引用状态', getOld: r => r.citation_status },
    content: { newVal: content, label: '内容', getOld: r => r.content },
    citation_urls: { 
      newVal: citation_urls, 
      label: '引用链接', 
      getOld: r => r.citation_urls,
      convertNew: v => JSON.stringify(v)
    }
  };

  for (const [key, cfg] of Object.entries(fieldsToCheck)) {
    if (cfg.newVal !== undefined) {
      const oldVal = cfg.getOld(existing);
      const strNewVal = cfg.convertNew ? cfg.convertNew(cfg.newVal) : cfg.newVal;
      if (oldVal !== strNewVal) {
        updates.push(`${key} = ?`);
        params.push(strNewVal);
        recordHistory(
          parseInt(id), cfg.label, oldVal, strNewVal,
          operator, change_note || `${cfg.label}变更`
        );
      }
    }
  }

  if (updates.length === 0) {
    return res.json(serializeTicket(existing));
  }

  updates.push(`updated_at = datetime('now')`);
  params.push(id);

  db.prepare(`UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  const row = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id) as any;
  res.json(serializeTicket(row));
});

router.post('/:id/review', (req: Request, res: Response) => {
  const { id } = req.params;
  const { reviewer, before_cluster, after_cluster, review_note, screenshot_descriptions } = req.body;
  const operator = req.headers['x-operator'] as string || reviewer || 'system';

  const existing = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ message: '工单不存在' });
  }

  const info = db.prepare(`
    INSERT INTO review_records (ticket_id, reviewer, before_cluster, after_cluster, review_note, screenshot_descriptions)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    parseInt(id), reviewer || '匿名', before_cluster, after_cluster,
    review_note || '', screenshot_descriptions || ''
  );

  if (after_cluster && (existing.final_cluster !== after_cluster)) {
    recordHistory(
      parseInt(id), '聚类结果(人工)', existing.final_cluster || existing.original_cluster,
      after_cluster, operator, `人工改判：${review_note || '无备注'}`
    );
    db.prepare('UPDATE tickets SET final_cluster = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(after_cluster, 'completed', parseInt(id));
  } else {
    db.prepare('UPDATE tickets SET updated_at = datetime(\'now\') WHERE id = ?').run(parseInt(id));
  }

  const record = db.prepare('SELECT * FROM review_records WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(record);
});

router.get('/:id/reviews', (req: Request, res: Response) => {
  const { id } = req.params;
  const rows = db.prepare('SELECT * FROM review_records WHERE ticket_id = ? ORDER BY created_at DESC').all(id);
  res.json(rows);
});

router.get('/:id/history', (req: Request, res: Response) => {
  const { id } = req.params;
  const rows = db.prepare(`
    SELECT * FROM history_versions 
    WHERE ticket_id = ? 
    ORDER BY version DESC, changed_at DESC
  `).all(id) as any[];

  const result: HistoryVersion[] = rows.map(r => ({
    ...r,
    old_screenshot_refs: parseJson<string[]>(r.old_screenshot_refs, [])
  }));

  res.json(result);
});

export default router;
