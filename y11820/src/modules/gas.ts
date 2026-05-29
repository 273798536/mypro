import { Router, Request, Response } from 'express';
import { getDb } from '../db/init';
import { GasFee } from '../types';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  const { chain, tx_hash, gas_used, gas_price_gwei, fee_native, fee_usd, block_timestamp } = req.body;
  if (!chain || !tx_hash || !gas_used || !gas_price_gwei || !fee_native || !block_timestamp) {
    return res.status(400).json({ error: '必填: chain, tx_hash, gas_used, gas_price_gwei, fee_native, block_timestamp' });
  }
  const db = getDb();
  try {
    const info = db.prepare(
      'INSERT INTO gas_fees (chain, tx_hash, gas_used, gas_price_gwei, fee_native, fee_usd, block_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(chain.toLowerCase(), tx_hash, gas_used, gas_price_gwei, fee_native, fee_usd || null, block_timestamp);
    const row = db.prepare('SELECT * FROM gas_fees WHERE id = ?').get(info.lastInsertRowid) as GasFee;
    res.status(201).json(row);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: '该交易哈希+链组合已存在' });
    }
    throw err;
  }
});

router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { chain, start_date, end_date } = req.query;
  let sql = 'SELECT * FROM gas_fees WHERE 1=1';
  const params: any[] = [];
  if (chain) { sql += ' AND chain = ?'; params.push(String(chain).toLowerCase()); }
  if (start_date) { sql += ' AND block_timestamp >= ?'; params.push(String(start_date)); }
  if (end_date) { sql += ' AND block_timestamp <= ?'; params.push(String(end_date) + 'T23:59:59'); }
  sql += ' ORDER BY block_timestamp DESC';
  const rows = db.prepare(sql).all(...params) as GasFee[];
  res.json(rows);
});

router.get('/summary', (req: Request, res: Response) => {
  const db = getDb();
  const { start_date, end_date } = req.query;
  let sql = `
    SELECT chain,
           COUNT(*) as tx_count,
           SUM(CAST(fee_usd AS REAL)) as total_fee_usd,
           AVG(CAST(gas_price_gwei AS REAL)) as avg_gas_price_gwei,
           SUM(CAST(fee_native AS REAL)) as total_fee_native
    FROM gas_fees WHERE 1=1
  `;
  const params: any[] = [];
  if (start_date) { sql += ' AND block_timestamp >= ?'; params.push(String(start_date)); }
  if (end_date) { sql += ' AND block_timestamp <= ?'; params.push(String(end_date) + 'T23:59:59'); }
  sql += ' GROUP BY chain ORDER BY total_fee_usd DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM gas_fees WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Gas费记录未找到' });
  db.prepare('DELETE FROM gas_fees WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export function computeTotalGasUsd(db: any, startDate: string, endDate: string): number {
  const row = db.prepare(`
    SELECT COALESCE(SUM(CAST(fee_usd AS REAL)), 0) as total
    FROM gas_fees
    WHERE block_timestamp >= ? AND block_timestamp <= ?
  `).get(startDate, endDate + 'T23:59:59') as { total: number };
  return row.total;
}

export default router;
