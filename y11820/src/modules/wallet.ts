import { Router, Request, Response } from 'express';
import { getDb } from '../db/init';
import { WalletAddress, WalletConclusionChange } from '../types';
import crypto from 'crypto';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  const { address, chain, label, group_id } = req.body;
  if (!address || !chain) {
    return res.status(400).json({ error: 'address 和 chain 必填' });
  }
  const db = getDb();
  try {
    const info = db.prepare(
      'INSERT INTO wallet_addresses (address, chain, label, group_id) VALUES (?, ?, ?, ?)'
    ).run(address.toLowerCase(), chain.toLowerCase(), label || '', group_id || null);
    const row = db.prepare('SELECT * FROM wallet_addresses WHERE id = ?').get(info.lastInsertRowid) as WalletAddress;
    res.status(201).json(row);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: '该地址+链组合已存在' });
    }
    throw err;
  }
});

router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM wallet_addresses ORDER BY id').all() as WalletAddress[];
  res.json(rows);
});

router.post('/consolidate', (req: Request, res: Response) => {
  const { wallet_ids, group_label } = req.body;
  if (!Array.isArray(wallet_ids) || wallet_ids.length < 2) {
    return res.status(400).json({ error: '至少需要2个钱包ID进行归并' });
  }
  const db = getDb();
  const groupId = crypto.randomUUID();

  const transaction = db.transaction(() => {
    for (const wid of wallet_ids) {
      const existing = db.prepare('SELECT * FROM wallet_addresses WHERE id = ?').get(wid) as WalletAddress | undefined;
      if (!existing) throw new Error(`钱包ID ${wid} 不存在`);
      const oldGroupId = existing.group_id || '';
      db.prepare('UPDATE wallet_addresses SET group_id = ? WHERE id = ?').run(groupId, wid);
      logConclusionChange(db, wid, 'group_id', oldGroupId, groupId, `地址归并: ${group_label || groupId}`, 'wallet_consolidate');
    }
    return db.prepare('SELECT * FROM wallet_addresses WHERE group_id = ?').all(groupId) as WalletAddress[];
  });

  try {
    const consolidated = transaction();
    res.json({ group_id: groupId, wallets: consolidated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/conclusion-changes', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM wallet_conclusion_changes ORDER BY created_at DESC'
  ).all() as WalletConclusionChange[];
  res.json(rows);
});

router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM wallet_addresses WHERE id = ?').get(req.params.id) as WalletAddress | undefined;
  if (!row) return res.status(404).json({ error: '钱包地址未找到' });
  res.json(row);
});

router.put('/:id', (req: Request, res: Response) => {
  const { label, group_id } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM wallet_addresses WHERE id = ?').get(req.params.id) as WalletAddress | undefined;
  if (!existing) return res.status(404).json({ error: '钱包地址未找到' });

  const oldLabel = existing.label;
  const oldGroupId = existing.group_id;

  db.prepare('UPDATE wallet_addresses SET label = ?, group_id = ? WHERE id = ?')
    .run(label ?? existing.label, group_id ?? existing.group_id, req.params.id);

  if (oldLabel !== (label ?? oldLabel)) {
    logConclusionChange(db, existing.id, 'label', oldLabel, label, '手动更新', 'wallet_update');
  }
  if (oldGroupId !== (group_id ?? oldGroupId)) {
    logConclusionChange(db, existing.id, 'group_id', oldGroupId || '', group_id || '', '地址归并', 'wallet_consolidate');
  }

  const updated = db.prepare('SELECT * FROM wallet_addresses WHERE id = ?').get(req.params.id) as WalletAddress;
  res.json(updated);
});

router.get('/:id/conclusion-changes', (req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM wallet_conclusion_changes WHERE wallet_id = ? ORDER BY created_at DESC'
  ).all(req.params.id) as WalletConclusionChange[];
  res.json(rows);
});

router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM wallet_addresses WHERE id = ?').get(req.params.id) as WalletAddress | undefined;
  if (!existing) return res.status(404).json({ error: '钱包地址未找到' });
  db.prepare('DELETE FROM wallet_addresses WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export function computeWalletSnapshotHash(): string {
  const db = getDb();
  const rows = db.prepare('SELECT id, address, chain, label, group_id FROM wallet_addresses ORDER BY id').all();
  return crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}

function logConclusionChange(
  db: any,
  walletId: number,
  field: string,
  oldValue: string,
  newValue: string,
  reason: string,
  source: string
): void {
  db.prepare(
    'INSERT INTO wallet_conclusion_changes (wallet_id, field_changed, old_value, new_value, reason, trigger_source) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(walletId, field, oldValue, newValue, reason, source);
}

export default router;
