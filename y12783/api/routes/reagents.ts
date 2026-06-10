import { Router, Request, Response } from 'express';
import * as store from '../repository/store.js';
import { getExportStatus } from '../../shared/utils/consistency.js';
import type { Reagent } from '../../shared/types/index.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const reagents = store.getAllReagents();
  const { category, search, lowStock } = req.query;

  let filtered = reagents;

  if (search && typeof search === 'string') {
    const s = search.toLowerCase();
    filtered = filtered.filter(r =>
      r.name.toLowerCase().includes(s) ||
      r.catalogNo.toLowerCase().includes(s) ||
      r.batchNo.toLowerCase().includes(s) ||
      r.manufacturer.toLowerCase().includes(s)
    );
  }

  if (category && typeof category === 'string' && category !== 'all') {
    filtered = filtered.filter(r => r.category === category);
  }

  if (lowStock === 'true') {
    filtered = filtered.filter(r => r.stock <= r.minStock);
  }

  res.json(filtered);
});

router.get('/categories', (_req: Request, res: Response) => {
  const reagents = store.getAllReagents();
  const categories = Array.from(new Set(reagents.map(r => r.category)));
  res.json(categories);
});

router.get('/:id', (req: Request, res: Response) => {
  const reagent = store.getReagentById(req.params.id);
  if (!reagent) {
    return res.status(404).json({ error: '试剂不存在' });
  }
  res.json(reagent);
});

router.get('/:id/transactions', (req: Request, res: Response) => {
  const transactions = store.getReagentTransactions(req.params.id);
  res.json(transactions);
});

router.post('/', (req: Request, res: Response) => {
  try {
    const data = req.body as Omit<Reagent, 'id' | 'createdAt' | 'updatedAt'>;
    const reagent = store.createReagent(data);
    res.status(201).json(reagent);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  const updated = store.updateReagent(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: '试剂不存在' });
  }
  res.json(updated);
});

router.delete('/:id', (req: Request, res: Response) => {
  const success = store.deleteReagent(req.params.id);
  if (!success) {
    return res.status(404).json({ error: '试剂不存在' });
  }
  res.json({ success: true });
});

router.post('/import', (req: Request, res: Response) => {
  const { items } = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'items 必须是数组' });
  }
  const result = store.importReagents(items);
  res.json(result);
});

router.get('/export/download', (_req: Request, res: Response) => {
  const reagents = store.getAllReagents();

  const headers = ['目录号', '名称', 'CAS号', '分类', '规格', '库存', '单位', '最低库存', '生产厂家', '批次号', '有效期', '存放位置', '备注'];

  const rows = reagents.map(r => [
    r.catalogNo,
    r.name,
    r.casNo || '',
    r.category,
    r.specification,
    String(r.stock),
    r.unit,
    String(r.minStock),
    r.manufacturer,
    r.batchNo,
    r.expiryDate,
    r.location,
    r.remark || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="reagent_ledger.csv"');
  res.send('\uFEFF' + csvContent);
});

router.post('/:id/transaction', (req: Request, res: Response) => {
  const { type, quantity, operator, relatedBatchId, remark } = req.body;

  if (!type || (type !== 'in' && type !== 'out')) {
    return res.status(400).json({ error: '类型必须是 in 或 out' });
  }
  if (typeof quantity !== 'number' || quantity <= 0) {
    return res.status(400).json({ error: '数量必须是正数' });
  }

  const result = store.addReagentTransaction(
    req.params.id,
    type as 'in' | 'out',
    quantity,
    operator || '系统',
    relatedBatchId,
    remark
  );

  if (!result) {
    return res.status(400).json({ error: '操作失败，可能是库存不足或试剂不存在' });
  }

  res.json(result);
});

export default router;
