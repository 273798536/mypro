import { Router, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { BatchReview, HistoricalAnswer } from '../../src/types/index.ts';
import { buildInitialBatch, recomputeBatch, buildExportReport } from '../../src/utils/difficultyEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'batches.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const initial = buildInitialBatch('BATCH-2025-0610-01');
    fs.writeFileSync(DATA_FILE, JSON.stringify([initial], null, 2), 'utf-8');
  }
}

function readBatches(): BatchReview[] {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as BatchReview[];
}

function writeBatches(batches: BatchReview[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(batches, null, 2), 'utf-8');
}

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const batches = readBatches();
  res.json({ success: true, data: batches.map((b) => ({ batchId: b.batchId, createdAt: b.createdAt, status: b.status, problemCount: b.problems.length })) });
});

router.post('/', (req: Request, res: Response) => {
  const { batchId } = req.body as { batchId?: string };
  const id = batchId || `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
  const batch = buildInitialBatch(id);
  const batches = readBatches();
  batches.push(batch);
  writeBatches(batches);
  res.json({ success: true, data: batch });
});

router.get('/:id', (req: Request, res: Response) => {
  const batches = readBatches();
  const batch = batches.find((b) => b.batchId === req.params.id);
  if (!batch) return res.status(404).json({ success: false, error: 'Batch not found' });
  res.json({ success: true, data: batch });
});

router.put('/:id', (req: Request, res: Response) => {
  const batches = readBatches();
  const idx = batches.findIndex((b) => b.batchId === req.params.id);
  if (idx < 0) return res.status(404).json({ success: false, error: 'Batch not found' });
  const updated = recomputeBatch({ ...batches[idx], ...req.body } as BatchReview);
  batches[idx] = updated;
  writeBatches(batches);
  res.json({ success: true, data: updated });
});

router.post('/:id/compute', (req: Request, res: Response) => {
  const batches = readBatches();
  const idx = batches.findIndex((b) => b.batchId === req.params.id);
  if (idx < 0) return res.status(404).json({ success: false, error: 'Batch not found' });
  const computed = recomputeBatch(batches[idx]);
  batches[idx] = computed;
  writeBatches(batches);
  res.json({ success: true, data: { conclusions: computed.conclusions, anomalies: computed.anomalies } });
});

router.post('/:id/historical-answers', (req: Request, res: Response) => {
  const batches = readBatches();
  const idx = batches.findIndex((b) => b.batchId === req.params.id);
  if (idx < 0) return res.status(404).json({ success: false, error: 'Batch not found' });
  const payload = req.body as HistoricalAnswer;
  const answer: HistoricalAnswer = { ...payload, id: Math.random().toString(36).slice(2, 10), recordedAt: new Date().toISOString() };
  batches[idx] = recomputeBatch({
    ...batches[idx],
    historicalAnswers: [...batches[idx].historicalAnswers, answer],
  });
  writeBatches(batches);
  res.json({ success: true, data: batches[idx].conclusions });
});

router.get('/:id/export', (req: Request, res: Response) => {
  const batches = readBatches();
  const batch = batches.find((b) => b.batchId === req.params.id);
  if (!batch) return res.status(404).json({ success: false, error: 'Batch not found' });
  res.json({ success: true, data: buildExportReport(batch) });
});

export default router;
