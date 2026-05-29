import { Router, Request, Response } from 'express';
import { getDb } from '../db/init';
import { ExchangeBill } from '../types';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  const { exchange_name, asset_symbol, amount, bill_type, bill_date, reference_id } = req.body;
  if (!exchange_name || !asset_symbol || !amount || !bill_type || !bill_date) {
    return res.status(400).json({ error: '必填: exchange_name, asset_symbol, amount, bill_type, bill_date' });
  }
  const db = getDb();
  const info = db.prepare(
    'INSERT INTO exchange_bills (exchange_name, asset_symbol, amount, bill_type, bill_date, reference_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(exchange_name, asset_symbol.toUpperCase(), amount, bill_type, bill_date, reference_id || null);
  const row = db.prepare('SELECT * FROM exchange_bills WHERE id = ?').get(info.lastInsertRowid) as ExchangeBill;
  res.status(201).json(row);
});

router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { exchange_name, asset_symbol, bill_type, bill_date } = req.query;
  let sql = 'SELECT * FROM exchange_bills WHERE 1=1';
  const params: any[] = [];
  if (exchange_name) { sql += ' AND exchange_name = ?'; params.push(String(exchange_name)); }
  if (asset_symbol) { sql += ' AND asset_symbol = ?'; params.push(String(asset_symbol).toUpperCase()); }
  if (bill_type) { sql += ' AND bill_type = ?'; params.push(String(bill_type)); }
  if (bill_date) { sql += ' AND bill_date = ?'; params.push(String(bill_date)); }
  sql += ' ORDER BY bill_date DESC';
  const rows = db.prepare(sql).all(...params) as ExchangeBill[];
  res.json(rows);
});

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM exchange_bills WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '账单未找到' });
  db.prepare('DELETE FROM exchange_bills WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export function computeExchangeBalance(db: any, assetSymbol?: string): any[] {
  let sql = `
    SELECT asset_symbol,
           SUM(CASE WHEN bill_type IN ('deposit', 'trade_buy', 'reward') THEN CAST(amount AS REAL) ELSE 0 END) as total_in,
           SUM(CASE WHEN bill_type IN ('withdraw', 'trade_sell', 'fee') THEN CAST(amount AS REAL) ELSE 0 END) as total_out,
           SUM(CASE WHEN bill_type IN ('deposit', 'trade_buy', 'reward') THEN CAST(amount AS REAL)
                    WHEN bill_type IN ('withdraw', 'trade_sell', 'fee') THEN -CAST(amount AS REAL)
                    ELSE 0 END) as net_balance
    FROM exchange_bills
  `;
  const params: any[] = [];
  if (assetSymbol) { sql += ' WHERE asset_symbol = ?'; params.push(assetSymbol.toUpperCase()); }
  sql += ' GROUP BY asset_symbol ORDER BY asset_symbol';
  return db.prepare(sql).all(...params);
}

export default router;
