import { Router, type Request, type Response } from 'express';
import { ReportService } from '../services/ReportService.js';
import type { ReportOptions } from '../../shared/types.js';
import fs from 'fs';

const router = Router();

function parseOptions(req: Request): ReportOptions {
  const opts: ReportOptions = {};
  const q = req.query;
  if (typeof q.statuses) {
    const arr = String(q.statuses).split(',').filter(Boolean);
    if (arr.length) opts.statuses = arr as ReportOptions['statuses'];
  }
  if (typeof q.start === 'string' && typeof q.end === 'string') {
    opts.point_range = { start: q.start, end: q.end };
  }
  if (typeof q.ids === 'string') {
    const arr = q.ids.split(',').filter(Boolean);
    if (arr.length) opts.anomaly_ids = arr;
  }
  return opts;
}

router.get('/', (req: Request, res: Response) => {
  const opts = parseOptions(req);
  const result = ReportService.generate(opts);
  res.json({ success: true, data: result });
});

router.get('/download', (req: Request, res: Response) => {
  const opts = parseOptions(req);
  const result = ReportService.generate(opts);
  const filePath = ReportService.saveToDisk(result);
  res.download(filePath, result.filename, (err) => {
    if (err) console.error('[download]', err);
  });
});

router.get('/:anomalyId', (req: Request, res: Response) => {
  const anomalyId = req.params.anomalyId;
  const result = ReportService.generateSingle(anomalyId);
  if (!result) {
    return res.status(404).json({ success: false, error: '异常对象不存在' });
  }
  res.json({ success: true, data: result });
});

router.get('/:anomalyId/download', (req: Request, res: Response) => {
  const anomalyId = req.params.anomalyId;
  const result = ReportService.generateSingle(anomalyId);
  if (!result) {
    return res.status(404).json({ success: false, error: '异常对象不存在' });
  }
  const filePath = ReportService.saveToDisk(result);
  res.download(filePath, result.filename);
});

router.get('/history/list', (_req: Request, res: Response) => {
  res.json({ success: true, data: ReportService.listReports() });
});

router.get('/history/:filename', (req: Request, res: Response) => {
  const p = ReportService.getReportPath(req.params.filename);
  if (!p) return res.status(404).json({ success: false, error: '文件不存在' });
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  fs.createReadStream(p).pipe(res);
});

export default router;
