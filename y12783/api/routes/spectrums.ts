import { Router, Request, Response } from 'express';
import * as store from '../repository/store.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const spectrums = store.getAllSpectrums();
  const { interpreted, month } = req.query;

  let filtered = spectrums;

  if (interpreted !== undefined) {
    const val = interpreted === 'true';
    filtered = filtered.filter(s => s.interpreted === val);
  }

  if (month && typeof month === 'string') {
    filtered = filtered.filter(s => s.capturedAt.startsWith(month));
  }

  filtered.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());

  res.json(filtered);
});

router.get('/:id', (req: Request, res: Response) => {
  const spectrum = store.getSpectrumById(req.params.id);
  if (!spectrum) {
    return res.status(404).json({ error: '谱图不存在' });
  }
  res.json(spectrum);
});

router.post('/:id/interpret', (req: Request, res: Response) => {
  const { status, remark, interpreter, consistentWithThickness } = req.body;

  if (!status || !['pass', 'pending', 'fail'].includes(status)) {
    return res.status(400).json({ error: '无效的判读状态' });
  }

  const result = store.interpretSpectrum(
    req.params.id,
    status as 'pass' | 'pending' | 'fail',
    remark || '',
    interpreter || '未知',
    consistentWithThickness ?? true
  );

  if (!result) {
    return res.status(404).json({ error: '谱图不存在' });
  }

  res.json(result);
});

router.post('/', (req: Request, res: Response) => {
  try {
    const data = req.body;
    const spectrum = store.createSpectrum(data);
    res.status(201).json(spectrum);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

export default router;
