import { Router, Request, Response } from 'express';
import { getDb } from '../db/init';
import { ChainTransfer } from '../types';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  const { tx_hash, chain, from_address, to_address, token_symbol, amount, block_timestamp } = req.body;
  if (!tx_hash || !chain || !from_address || !to_address || !token_symbol || !amount || !block_timestamp) {
    return res.status(400).json({ error: '所有字段必填: tx_hash, chain, from_address, to_address, token_symbol, amount, block_timestamp' });
  }
  const db = getDb();
  const wallets = db.prepare('SELECT address FROM wallet_addresses').all() as { address: string }[];
  const walletSet = new Set(wallets.map(w => w.address.toLowerCase()));
  const isInternal = walletSet.has(from_address.toLowerCase()) && walletSet.has(to_address.toLowerCase()) ? 1 : 0;

  try {
    const info = db.prepare(
      'INSERT INTO chain_transfers (tx_hash, chain, from_address, to_address, token_symbol, amount, block_timestamp, is_internal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(tx_hash, chain.toLowerCase(), from_address.toLowerCase(), to_address.toLowerCase(), token_symbol.toUpperCase(), amount, block_timestamp, isInternal);
    const row = db.prepare('SELECT * FROM chain_transfers WHERE id = ?').get(info.lastInsertRowid) as ChainTransfer;
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
  const { chain, from_address, to_address, is_internal } = req.query;
  let sql = 'SELECT * FROM chain_transfers WHERE 1=1';
  const params: any[] = [];
  if (chain) { sql += ' AND chain = ?'; params.push(String(chain).toLowerCase()); }
  if (from_address) { sql += ' AND from_address = ?'; params.push(String(from_address).toLowerCase()); }
  if (to_address) { sql += ' AND to_address = ?'; params.push(String(to_address).toLowerCase()); }
  if (is_internal !== undefined) { sql += ' AND is_internal = ?'; params.push(Number(is_internal)); }
  sql += ' ORDER BY block_timestamp DESC';
  const rows = db.prepare(sql).all(...params) as ChainTransfer[];
  res.json(rows);
});

router.get('/duplicates/cross-chain', (_req: Request, res: Response) => {
  const db = getDb();
  const duplicates = db.prepare(`
    SELECT a.id as id_a, b.id as id_b,
           a.tx_hash as tx_hash_a, b.tx_hash as tx_hash_b,
           a.chain as chain_a, b.chain as chain_b,
           a.from_address, a.to_address, a.token_symbol, a.amount, a.block_timestamp
    FROM chain_transfers a
    JOIN chain_transfers b ON a.id < b.id
      AND a.from_address = b.from_address
      AND a.to_address = b.to_address
      AND a.token_symbol = b.token_symbol
      AND a.amount = b.amount
      AND a.block_timestamp = b.block_timestamp
      AND a.chain != b.chain
    ORDER BY a.block_timestamp DESC
  `).all();
  res.json(duplicates);
});

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM chain_transfers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '转账记录未找到' });
  db.prepare('DELETE FROM chain_transfers WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export function detectCrossChainDuplicates(db: any): any[] {
  return db.prepare(`
    SELECT a.id as id_a, b.id as id_b,
           a.tx_hash as tx_hash_a, b.tx_hash as tx_hash_b,
           a.chain as chain_a, b.chain as chain_b,
           a.from_address, a.to_address, a.token_symbol, a.amount, a.block_timestamp
    FROM chain_transfers a
    JOIN chain_transfers b ON a.id < b.id
      AND a.from_address = b.from_address
      AND a.to_address = b.to_address
      AND a.token_symbol = b.token_symbol
      AND a.amount = b.amount
      AND a.block_timestamp = b.block_timestamp
      AND a.chain != b.chain
  `).all();
}

export function detectInternalTransferMiscount(db: any): any[] {
  const internalTransfers = db.prepare(
    'SELECT * FROM chain_transfers WHERE is_internal = 1 ORDER BY block_timestamp'
  ).all() as ChainTransfer[];

  const issues: any[] = [];
  const seen = new Map<string, ChainTransfer[]>();

  for (const t of internalTransfers) {
    const key = [t.from_address, t.to_address, t.token_symbol, t.amount, t.block_timestamp.slice(0, 10)].join('|');
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key)!.push(t);
  }

  for (const [key, transfers] of seen) {
    if (transfers.length > 1) {
      issues.push({
        type: 'internal_transfer_miscount',
        description: `同日内部转账可能重复计算: ${transfers[0].token_symbol} ${transfers[0].amount}, ${transfers[0].from_address} → ${transfers[0].to_address}`,
        transfer_ids: transfers.map(t => t.id),
        count: transfers.length
      });
    }
  }

  return issues;
}

export default router;
