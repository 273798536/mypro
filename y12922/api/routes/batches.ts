import { Router, type Request, type Response } from 'express';
import {
  dashboard,
  importBatch,
  listBatches,
  getBatchDetail,
  advanceStatus,
} from '../services/batchService.js';
import { listByBatch } from '../services/anomalyService.js';
import { generateReport, getLatestReport } from '../services/reportService.js';
import { compareBatches, listComparisons } from '../services/compareService.js';
import type { ImportRequest, BatchStatus, AnomalyType, AnomalyStatus } from '../../shared/types.js';

const router = Router();

function ok<T>(res: Response, data: T): void {
  res.json({ success: true, data });
}

function fail(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : '请求失败';
  res.status(400).json({ success: false, error: message });
}

router.get('/dashboard', (req: Request, res: Response) => {
  try {
    ok(res, dashboard());
  } catch (e) { fail(res, e); }
});

router.get('/', (req: Request, res: Response) => {
  try {
    const status = (req.query.status as BatchStatus) || undefined;
    const q = (req.query.q as string) || undefined;
    ok(res, listBatches({ status, q }));
  } catch (e) { fail(res, e); }
});

router.post('/import', (req: Request, res: Response) => {
  try {
    const body = req.body as ImportRequest;
    if (!body.batchNo || !Array.isArray(body.samples)) {
      throw new Error('缺少 batchNo 或 samples');
    }
    ok(res, importBatch(body));
  } catch (e) { fail(res, e); }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    ok(res, getBatchDetail(req.params.id));
  } catch (e) { fail(res, e); }
});

router.patch('/:id/status', (req: Request, res: Response) => {
  try {
    const { status } = req.body as { status: BatchStatus };
    if (!status) throw new Error('缺少 status');
    ok(res, advanceStatus(req.params.id, status));
  } catch (e) { fail(res, e); }
});

router.get('/:id/anomalies', (req: Request, res: Response) => {
  try {
    const type = (req.query.type as AnomalyType) || undefined;
    const status = (req.query.status as AnomalyStatus) || undefined;
    ok(res, listByBatch(req.params.id, { type, status }));
  } catch (e) { fail(res, e); }
});

router.post('/:id/report', (req: Request, res: Response) => {
  try {
    ok(res, generateReport(req.params.id));
  } catch (e) { fail(res, e); }
});

router.get('/:id/report', (req: Request, res: Response) => {
  try {
    ok(res, getLatestReport(req.params.id));
  } catch (e) { fail(res, e); }
});

router.post('/:id/compare', (req: Request, res: Response) => {
  try {
    const { againstBatchId } = req.body as { againstBatchId: string };
    if (!againstBatchId) throw new Error('缺少 againstBatchId');
    ok(res, compareBatches(req.params.id, againstBatchId));
  } catch (e) { fail(res, e); }
});

router.get('/:id/comparisons', (req: Request, res: Response) => {
  try {
    ok(res, listComparisons(req.params.id));
  } catch (e) { fail(res, e); }
});

export default router;
