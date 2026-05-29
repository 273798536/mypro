import { Router, Request, Response } from 'express';
import { getDb } from '../db/init';
import { PriceSnapshot, WalletConclusionChange } from '../types';
import { computeWalletSnapshotHash } from './wallet';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  const { token_symbol, price_usd, snapshot_date, source } = req.body;
  if (!token_symbol || !price_usd || !snapshot_date) {
    return res.status(400).json({ error: '必填: token_symbol, price_usd, snapshot_date' });
  }
  const db = getDb();
  const hashBefore = computeWalletSnapshotHash();

  try {
    const info = db.prepare(
      'INSERT INTO price_snapshots (token_symbol, price_usd, snapshot_date, source) VALUES (?, ?, ?, ?)'
    ).run(token_symbol.toUpperCase(), String(price_usd), snapshot_date, source || 'manual');
    const row = db.prepare('SELECT * FROM price_snapshots WHERE id = ?').get(info.lastInsertRowid) as PriceSnapshot;

    const hashAfter = computeWalletSnapshotHash();
    const walletConclusionsChanged = hashBefore !== hashAfter;

    res.status(201).json({
      snapshot: row,
      wallet_conclusions_changed: walletConclusionsChanged,
      wallet_snapshot_hash_before: hashBefore,
      wallet_snapshot_hash_after: hashAfter
    });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: '该币种+日期+来源组合已存在，请用 PUT 更新' });
    }
    throw err;
  }
});

router.put('/:id', (req: Request, res: Response) => {
  const { price_usd, source } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM price_snapshots WHERE id = ?').get(req.params.id) as PriceSnapshot | undefined;
  if (!existing) return res.status(404).json({ error: '币价快照未找到' });

  const hashBefore = computeWalletSnapshotHash();

  db.prepare('UPDATE price_snapshots SET price_usd = ?, source = ? WHERE id = ?')
    .run(String(price_usd ?? existing.price_usd), source ?? existing.source, req.params.id);

  const updated = db.prepare('SELECT * FROM price_snapshots WHERE id = ?').get(req.params.id) as PriceSnapshot;
  const hashAfter = computeWalletSnapshotHash();

  res.json({
    snapshot: updated,
    wallet_conclusions_changed: hashBefore !== hashAfter,
    wallet_snapshot_hash_before: hashBefore,
    wallet_snapshot_hash_after: hashAfter
  });
});

router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { token_symbol, snapshot_date } = req.query;
  let sql = 'SELECT * FROM price_snapshots WHERE 1=1';
  const params: any[] = [];
  if (token_symbol) { sql += ' AND token_symbol = ?'; params.push(String(token_symbol).toUpperCase()); }
  if (snapshot_date) { sql += ' AND snapshot_date = ?'; params.push(String(snapshot_date)); }
  sql += ' ORDER BY snapshot_date DESC, token_symbol';
  const rows = db.prepare(sql).all(...params) as PriceSnapshot[];
  res.json(rows);
});

router.get('/gaps', (req: Request, res: Response) => {
  const db = getDb();
  const { start_date, end_date, token_symbol } = req.query;
  const startDate = String(start_date || '2024-01-01');
  const endDate = String(end_date || new Date().toISOString().slice(0, 10));

  const tokens = token_symbol
    ? [String(token_symbol).toUpperCase()]
    : (db.prepare('SELECT DISTINCT token_symbol FROM price_snapshots ORDER BY token_symbol').all() as { token_symbol: string }[]).map(r => r.token_symbol);

  const gaps: { token: string; missing_dates: string[] }[] = [];

  for (const token of tokens) {
    const dates = db.prepare(
      'SELECT DISTINCT snapshot_date FROM price_snapshots WHERE token_symbol = ? AND snapshot_date >= ? AND snapshot_date <= ? ORDER BY snapshot_date'
    ).all(token, startDate, endDate) as { snapshot_date: string }[];

    const dateSet = new Set(dates.map(d => d.snapshot_date));
    const missing: string[] = [];
    let current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
      const dateStr = current.toISOString().slice(0, 10);
      if (!dateSet.has(dateStr)) {
        missing.push(dateStr);
      }
      current.setDate(current.getDate() + 1);
    }
    if (missing.length > 0) {
      gaps.push({ token, missing_dates: missing });
    }
  }

  res.json(gaps);
});

router.post('/fill-gaps', (req: Request, res: Response) => {
  const { fills } = req.body;
  if (!Array.isArray(fills)) {
    return res.status(400).json({ error: 'fills 必须是数组: [{token_symbol, price_usd, snapshot_date, source?}]' });
  }
  const db = getDb();
  const hashBefore = computeWalletSnapshotHash();

  const transaction = db.transaction(() => {
    const results: PriceSnapshot[] = [];
    for (const fill of fills) {
      const { token_symbol, price_usd, snapshot_date, source } = fill;
      if (!token_symbol || !price_usd || !snapshot_date) continue;

      const existing = db.prepare(
        'SELECT id FROM price_snapshots WHERE token_symbol = ? AND snapshot_date = ? AND source = ?'
      ).get(token_symbol.toUpperCase(), snapshot_date, source || 'manual') as { id: number } | undefined;

      if (existing) {
        db.prepare('UPDATE price_snapshots SET price_usd = ? WHERE id = ?').run(String(price_usd), existing.id);
        results.push(db.prepare('SELECT * FROM price_snapshots WHERE id = ?').get(existing.id) as PriceSnapshot);
      } else {
        const info = db.prepare(
          'INSERT INTO price_snapshots (token_symbol, price_usd, snapshot_date, source) VALUES (?, ?, ?, ?)'
        ).run(token_symbol.toUpperCase(), String(price_usd), snapshot_date, source || 'manual');
        results.push(db.prepare('SELECT * FROM price_snapshots WHERE id = ?').get(info.lastInsertRowid) as PriceSnapshot);
      }
    }
    return results;
  });

  const results = transaction();
  const hashAfter = computeWalletSnapshotHash();

  res.json({
    filled: results,
    wallet_conclusions_changed: hashBefore !== hashAfter,
    wallet_snapshot_hash_before: hashBefore,
    wallet_snapshot_hash_after: hashAfter
  });
});

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM price_snapshots WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '币价快照未找到' });
  db.prepare('DELETE FROM price_snapshots WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export function detectPriceGaps(db: any, startDate: string, endDate: string): any[] {
  const tokens = db.prepare('SELECT DISTINCT token_symbol FROM price_snapshots').all() as { token_symbol: string }[];
  const gaps: any[] = [];

  for (const { token_symbol } of tokens) {
    const dates = db.prepare(
      'SELECT DISTINCT snapshot_date FROM price_snapshots WHERE token_symbol = ? AND snapshot_date >= ? AND snapshot_date <= ? ORDER BY snapshot_date'
    ).all(token_symbol, startDate, endDate) as { snapshot_date: string }[];

    const dateSet = new Set(dates.map(d => d.snapshot_date));
    const missing: string[] = [];
    let current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
      const dateStr = current.toISOString().slice(0, 10);
      if (!dateSet.has(dateStr)) missing.push(dateStr);
      current.setDate(current.getDate() + 1);
    }
    if (missing.length > 0) {
      gaps.push({ token: token_symbol, missing_dates: missing });
    }
  }

  return gaps;
}

export default router;
