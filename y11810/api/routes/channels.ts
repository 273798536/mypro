import { Router, type Request, type Response } from 'express';
import db from '../db/index.js';
import type { Channel, RateHistory } from '../../shared/types/index.js';

const router = Router();

function getPaginationParams(query: Request['query']): { page: number; pageSize: number } {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize as string, 10) || 20));
  return { page, pageSize };
}

function mapChannel(row: any): Channel {
  return {
    id: row.id,
    name: row.name,
    account: row.account,
    rate: row.rate,
    status: row.status as Channel['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRateHistory(row: any): RateHistory {
  return {
    id: row.id,
    channelId: row.channel_id,
    oldRate: row.old_rate,
    newRate: row.new_rate,
    effectiveDate: row.effective_date,
    reason: row.reason,
    operator: row.operator,
    createdAt: row.created_at,
  };
}

router.get('/', (req: Request, res: Response): void => {
  const { page, pageSize } = getPaginationParams(req.query);
  const offset = (page - 1) * pageSize;

  const countRow = db.prepare('SELECT COUNT(*) as count FROM channel').get() as any;
  const total = countRow.count;

  const rows = db.prepare('SELECT * FROM channel ORDER BY created_at DESC LIMIT ? OFFSET ?').all(pageSize, offset) as any[];
  const items = rows.map(mapChannel);

  res.json({
    success: true,
    data: {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
    traceId: req.traceId,
  });
});

router.post('/', (req: Request, res: Response): void => {
  const { name, account, rate, status } = req.body;

  if (!name || !account || rate === undefined) {
    res.status(400).json({
      success: false,
      error: '缺少必要字段: name, account, rate',
      traceId: req.traceId,
    });
    return;
  }

  const existing = db.prepare('SELECT id FROM channel WHERE account = ?').get(account);
  if (existing) {
    res.status(400).json({
      success: false,
      error: '渠道账号已存在',
      traceId: req.traceId,
    });
    return;
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO channel (id, name, account, rate, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, account, rate, status || 'active', now, now);

  const row = db.prepare('SELECT * FROM channel WHERE id = ?').get(id) as any;
  const channel = mapChannel(row);

  res.json({
    success: true,
    data: channel,
    traceId: req.traceId,
  });
});

router.put('/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const { name, account, rate, status } = req.body;

  const existingRow = db.prepare('SELECT * FROM channel WHERE id = ?').get(id) as any;
  if (!existingRow) {
    res.status(404).json({
      success: false,
      error: '渠道不存在',
      traceId: req.traceId,
    });
    return;
  }

  const oldChannel = mapChannel(existingRow);

  if (account && account !== oldChannel.account) {
    const duplicate = db.prepare('SELECT id FROM channel WHERE account = ? AND id != ?').get(account, id);
    if (duplicate) {
      res.status(400).json({
        success: false,
        error: '渠道账号已存在',
        traceId: req.traceId,
      });
      return;
    }
  }

  const fields: string[] = [];
  const values: any[] = [];
  const now = new Date().toISOString();

  if (name !== undefined) {
    fields.push('name = ?');
    values.push(name);
  }
  if (account !== undefined) {
    fields.push('account = ?');
    values.push(account);
  }
  if (rate !== undefined) {
    fields.push('rate = ?');
    values.push(rate);
  }
  if (status !== undefined) {
    fields.push('status = ?');
    values.push(status);
  }
  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE channel SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  if (rate !== undefined && rate !== oldChannel.rate) {
    const historyId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO rate_history (id, channel_id, old_rate, new_rate, effective_date, reason, operator, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      historyId,
      id,
      oldChannel.rate,
      rate,
      now,
      req.body.reason || '费率变更',
      req.operator.name,
      now
    );
  }

  const updatedRow = db.prepare('SELECT * FROM channel WHERE id = ?').get(id) as any;
  const updatedChannel = mapChannel(updatedRow);

  res.json({
    success: true,
    data: updatedChannel,
    traceId: req.traceId,
  });
});

router.get('/:id/rate-history', (req: Request, res: Response): void => {
  const { id } = req.params;

  const channel = db.prepare('SELECT id FROM channel WHERE id = ?').get(id);
  if (!channel) {
    res.status(404).json({
      success: false,
      error: '渠道不存在',
      traceId: req.traceId,
    });
    return;
  }

  const rows = db.prepare(`
    SELECT * FROM rate_history 
    WHERE channel_id = ? 
    ORDER BY effective_date DESC
  `).all(id) as any[];

  const history = rows.map(mapRateHistory);

  res.json({
    success: true,
    data: history,
    traceId: req.traceId,
  });
});

export default router;
