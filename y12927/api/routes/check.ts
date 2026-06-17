import { Router } from 'express';
import { batches, anomalies, modelLogs, corrections, examples } from '../data/mockData';

const router = Router();

router.get('/batches', (_req, res) => {
  res.json(batches);
});

router.get('/batches/:id', (req, res) => {
  const batch = batches.find((b) => b.id === req.params.id);
  if (!batch) return res.status(404).json({ error: '批次不存在' });
  res.json(batch);
});

router.get('/anomalies', (req, res) => {
  const { batchId, type, status } = req.query;
  let result = anomalies;
  if (batchId) result = result.filter((a) => a.batchId === batchId);
  if (type) result = result.filter((a) => a.type === type);
  if (status) result = result.filter((a) => a.status === status);
  res.json(result);
});

router.get('/anomalies/:id', (req, res) => {
  const anomaly = anomalies.find((a) => a.id === req.params.id);
  if (!anomaly) return res.status(404).json({ error: '异常不存在' });
  const logs = modelLogs.filter((l) => l.anomalyId === anomaly.id);
  const relatedExamples = examples.filter((e) => e.anomalyType === anomaly.type);
  const correction = corrections.find((c) => c.anomalyId === anomaly.id);
  res.json({ anomaly, logs, examples: relatedExamples, correction });
});

router.get('/corrections', (_req, res) => {
  res.json(corrections);
});

router.post('/corrections', (req, res) => {
  const { anomalyId, action, opinion, operator } = req.body;
  if (!anomalyId || !action || !opinion) {
    return res.status(400).json({ error: '参数不完整' });
  }
  const existingIdx = corrections.findIndex((c) => c.anomalyId === anomalyId);
  const now = new Date().toISOString();
  if (existingIdx >= 0) {
    corrections[existingIdx] = {
      ...corrections[existingIdx],
      action,
      opinion,
      operator: operator || '未知',
      correctedAt: now,
      isExported: false,
    };
    res.json(corrections[existingIdx]);
  } else {
    const newCorrection = {
      id: `COR-${String(corrections.length + 1).padStart(3, '0')}`,
      anomalyId,
      action,
      opinion,
      operator: operator || '未知',
      correctedAt: now,
      isExported: false,
    };
    corrections.push(newCorrection);
    const anom = anomalies.find((a) => a.id === anomalyId);
    if (anom) anom.status = 'resolved';
    res.json(newCorrection);
  }
});

router.get('/examples', (_req, res) => {
  res.json(examples);
});

router.post('/report/metadata', (req, res) => {
  const { batchId } = req.body;
  const batchAnomalies = batchId
    ? anomalies.filter((a) => a.batchId === batchId)
    : anomalies;
  const relatedCorrections = corrections.filter((c) =>
    batchAnomalies.some((a) => a.id === c.anomalyId),
  );
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const baseName = `训练切分隔离检查_${stamp}_${batchId || 'ALL'}`;
  res.json({
    fileNameBase: baseName,
    totalAnomalies: batchAnomalies.length,
    resolvedCount: relatedCorrections.length,
    pendingCount: batchAnomalies.filter((a) => a.status === 'pending').length,
    generatedAt: now.toISOString(),
    batchId: batchId || 'ALL',
  });
});

export default router;
