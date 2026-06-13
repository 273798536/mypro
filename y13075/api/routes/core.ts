import { Router, type Request, type Response } from 'express';
import { RecordService } from '../services/RecordService.js';
import { AnomalyService } from '../services/AnomalyService.js';
import { DetectionService } from '../services/DetectionService.js';
import type { StatsSummary } from '../../shared/types.js';

const router = Router();

router.post('/records/seed', (_req: Request, res: Response) => {
  try {
    const s1 = RecordService.seedIfEmpty();
    const s2 = AnomalyService.seedIfEmpty();
    res.json({
      success: true,
      records: s1.records.length,
      anomalies: s2.anomalies.length,
      records_seeded: s1.seeded,
      anomalies_seeded: s2.seeded,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message ?? 'seed 失败' });
  }
});

router.get('/records', (_req: Request, res: Response) => {
  RecordService.seedIfEmpty();
  AnomalyService.seedIfEmpty();
  res.json({ success: true, data: RecordService.getAll() });
});

router.get('/anomalies', (_req: Request, res: Response) => {
  RecordService.seedIfEmpty();
  AnomalyService.seedIfEmpty();
  res.json({ success: true, data: AnomalyService.getAll() });
});

router.get('/anomalies/:id', (req: Request, res: Response) => {
  const anomaly = AnomalyService.getById(req.params.id);
  if (!anomaly) {
    return res.status(404).json({ success: false, error: '异常对象不存在' });
  }
  const record = RecordService.getById(anomaly.sensor_record_id);
  res.json({ success: true, data: { anomaly, sensor_record: record ?? null } });
});

router.patch('/anomalies/:id/remark', (req: Request, res: Response) => {
  const remark = typeof req.body?.remark === 'string' ? req.body.remark : '';
  const result = AnomalyService.updateRemark(req.params.id, remark);
  if (!result) {
    return res.status(404).json({ success: false, error: '异常对象不存在' });
  }
  res.json({ success: true, data: result });
});

router.patch('/anomalies/:id/status', (req: Request, res: Response) => {
  const { status } = req.body ?? {};
  if (!['normal', 'pending', 'confirmed_anomaly', 'dismissed'].includes(status)) {
    return res.status(400).json({ success: false, error: 'status 参数非法' });
  }
  const result = AnomalyService.updateStatus(req.params.id, status);
  if (!result) {
    return res.status(404).json({ success: false, error: '异常对象不存在' });
  }
  res.json({ success: true, data: result });
});

router.post('/detect/adjacent', (_req: Request, res: Response) => {
  RecordService.seedIfEmpty();
  AnomalyService.seedIfEmpty();
  const found = DetectionService.runAdjacentDetection();
  res.json({ success: true, count: found.length, data: found });
});

router.get('/stats', (_req: Request, res: Response) => {
  RecordService.seedIfEmpty();
  AnomalyService.seedIfEmpty();
  const records = RecordService.getAll();
  const anomalies = AnomalyService.getAll();
  const summary: StatsSummary = {
    total_records: records.length,
    total_anomalies: anomalies.length,
    pending_count: anomalies.filter(a => a.status === 'pending').length,
    reviewed_count: anomalies.filter(a => a.status === 'confirmed_anomaly' || a.status === 'dismissed').length,
    dirty_count: records.filter(r => r.is_dirty).length,
  };
  res.json({ success: true, data: summary });
});

export default router;
