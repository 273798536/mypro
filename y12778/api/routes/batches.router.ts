import { Router } from 'express';
import { getAllBatches, getBatchDetail } from '../services/batch.service';

const router = Router();

router.get('/', (req, res) => {
  res.json(getAllBatches());
});

router.get('/:batchNo', (req, res) => {
  const batch = getBatchDetail(req.params.batchNo);
  if (!batch) {
    res.status(404).json({ message: '批次不存在' });
    return;
  }
  res.json(batch);
});

export default router;
