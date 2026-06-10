import { Router, Request, Response } from 'express';
import * as store from '../repository/store.js';
import { calculateThickness } from '../../shared/utils/calculate.js';
import type { Batch, ThicknessRecord } from '../../shared/types/index.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const batches = store.getAllBatches();
  const { status, search, limit } = req.query;

  let filtered = batches;

  if (search && typeof search === 'string') {
    const s = search.toLowerCase();
    filtered = filtered.filter(b =>
      b.batchNo.toLowerCase().includes(s) ||
      b.materialNo.toLowerCase().includes(s) ||
      b.materialName.toLowerCase().includes(s) ||
      b.operator.toLowerCase().includes(s)
    );
  }

  if (status && typeof status === 'string' && status !== 'all') {
    filtered = filtered.filter(b => b.status === status);
  }

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (limit && typeof limit === 'string') {
    const n = parseInt(limit, 10);
    if (!isNaN(n) && n > 0) {
      filtered = filtered.slice(0, n);
    }
  }

  res.json(filtered);
});

router.get('/stats', (_req: Request, res: Response) => {
  const batches = store.getAllBatches();
  const today = new Date().toISOString().split('T')[0];

  const todayCount = batches.filter(b => b.createdAt.startsWith(today)).length;
  const pendingCount = batches.filter(b => b.status === 'pending').length;
  const completedCount = batches.filter(b => b.status === 'completed').length;
  const exceptionCount = batches.filter(b => b.status === 'exception').length;

  res.json({
    today: todayCount,
    pending: pendingCount,
    completed: completedCount,
    exception: exceptionCount,
    total: batches.length,
  });
});

router.get('/:id', (req: Request, res: Response) => {
  const batch = store.getBatchById(req.params.id);
  if (!batch) {
    return res.status(404).json({ error: '批次不存在' });
  }
  res.json(batch);
});

router.post('/', (req: Request, res: Response) => {
  try {
    const data = req.body as Omit<Batch, 'id' | 'createdAt' | 'updatedAt'>;
    const existingBatches = store.getAllBatches();
    const duplicate = existingBatches.find(
      b => b.batchNo === data.batchNo && b.materialNo === data.materialNo
    );
    if (duplicate) {
      return res.status(409).json({
        error: '批次已存在',
        existingBatch: duplicate,
      });
    }
    const batch = store.createBatch(data);
    res.status(201).json(batch);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  const updated = store.updateBatch(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: '批次不存在' });
  }
  res.json(updated);
});

router.delete('/:id', (req: Request, res: Response) => {
  const success = store.deleteBatch(req.params.id);
  if (!success) {
    return res.status(404).json({ error: '批次不存在' });
  }
  res.json({ success: true });
});

router.post('/import', (req: Request, res: Response) => {
  const { items } = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'items 必须是数组' });
  }
  const result = store.importBatches(items);
  res.json(result);
});

router.get('/:id/thickness', (req: Request, res: Response) => {
  const records = store.getThicknessRecords(req.params.id);
  res.json(records);
});

router.post('/:id/thickness/calculate', (req: Request, res: Response) => {
  const { parameters, algorithm, blankControlComplete } = req.body;

  if (!parameters || !parameters.wavelength || !parameters.refractiveIndex) {
    return res.status(400).json({ error: '波长和折射率是必填参数' });
  }

  const result = calculateThickness(
    parameters,
    algorithm || 'standard',
    blankControlComplete !== false
  );

  res.json({
    parameters,
    algorithm: algorithm || 'standard',
    blankControlComplete: blankControlComplete !== false,
    ...result,
  });
});

router.post('/:id/thickness', (req: Request, res: Response) => {
  const batch = store.getBatchById(req.params.id);
  if (!batch) {
    return res.status(404).json({ error: '批次不存在' });
  }

  const {
    parameters,
    algorithm = 'standard',
    blankControlComplete = true,
    operator = '系统',
    status = 'pending',
    remark = '',
    source = 'web',
  } = req.body;

  if (!parameters || !parameters.wavelength || !parameters.refractiveIndex) {
    return res.status(400).json({ error: '波长和折射率是必填参数' });
  }

  const calcResult = calculateThickness(parameters, algorithm, blankControlComplete);

  const record = store.addThicknessRecord(req.params.id, {
    algorithm,
    blankControlComplete,
    parameters,
    thicknessNm: calcResult.thicknessNm,
    confidenceMin: calcResult.confidenceMin,
    confidenceMax: calcResult.confidenceMax,
    source,
    operator,
    status,
    remark,
  });

  if (!record) {
    return res.status(500).json({ error: '保存厚度记录失败' });
  }

  res.status(201).json(record);
});

export default router;
