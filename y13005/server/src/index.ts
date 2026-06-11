import express, { Request, Response } from 'express';
import cors from 'cors';
import { db, initSchema } from './db';
import { Batch, BatchDetail, CurrencyAnomaly, ReceiptWithReview, ReviewHistory, ReviewRecord } from './types';

initSchema();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/batches', (_req: Request, res: Response<Batch[]>) => {
  const batches = db.prepare('SELECT * FROM batches ORDER BY created_at DESC').all() as Batch[];
  res.json(batches);
});

app.get('/api/batches/:id', (req: Request, res: Response<BatchDetail | { error: string }>) => {
  const batchId = Number(req.params.id);
  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId) as Batch | undefined;
  if (!batch) {
    res.status(404).json({ error: '批次不存在' });
    return;
  }

  const receipts = db.prepare('SELECT * FROM receipts WHERE batch_id = ? ORDER BY id').all(batchId) as ReceiptWithReview[];

  const enriched = receipts.map((r) => {
    const review = db.prepare('SELECT * FROM review_records WHERE receipt_id = ? ORDER BY id DESC LIMIT 1').get(r.id) as ReviewRecord | undefined;
    const histories = db.prepare('SELECT * FROM review_history WHERE receipt_id = ? ORDER BY version ASC').all(r.id) as ReviewHistory[];
    return { ...r, review: review ?? null, histories };
  });

  const anomalies = db.prepare('SELECT * FROM currency_anomalies WHERE batch_id = ? AND resolved = 0 ORDER BY id DESC').all(batchId) as CurrencyAnomaly[];

  const stats = {
    total: enriched.length,
    pass: enriched.filter(r => r.review?.status === 'pass').length,
    pending: enriched.filter(r => !r.review || r.review.status === 'pending').length,
    needs_material: enriched.filter(r => r.review?.status === 'needs_material' || r.review?.needs_material).length,
    anomaly: enriched.filter(r => r.is_currency_anomaly === 1).length,
    overridden: enriched.filter(r => r.review?.is_manual_override === 1).length,
  };

  res.json({ ...batch, receipts: enriched, anomalies, stats });
});

app.get('/api/anomalies', (_req: Request, res: Response<(CurrencyAnomaly & { batch_no: string; batch_name: string; receipt_no: string | null })[]>) => {
  const rows = db.prepare(`
    SELECT ca.*, b.batch_no, b.batch_name, r.receipt_no
    FROM currency_anomalies ca
    JOIN batches b ON ca.batch_id = b.id
    JOIN receipts r ON ca.receipt_id = r.id
    WHERE ca.resolved = 0
    ORDER BY ca.created_at DESC
  `).all() as (CurrencyAnomaly & { batch_no: string; batch_name: string; receipt_no: string | null })[];
  res.json(rows);
});

interface OverrideReviewBody {
  reviewer: string;
  manual_conclusion: string;
  override_reason: string;
  override_impact: string;
  status: 'pass' | 'fail' | 'needs_material' | 'pending';
  supplementary_material?: string;
  review_guidance?: string;
  needs_material?: string;
}

app.post('/api/receipts/:receiptId/review', (req: Request, res: Response<{ ok: true; review_id: number } | { error: string }>) => {
  const receiptId = Number(req.params.receiptId);
  const body = req.body as OverrideReviewBody;

  const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(receiptId) as { id: number; batch_id: number } | undefined;
  if (!receipt) {
    res.status(404).json({ error: '回执不存在' });
    return;
  }

  const existing = db.prepare('SELECT * FROM review_records WHERE receipt_id = ? ORDER BY id DESC LIMIT 1').get(receiptId) as ReviewRecord | undefined;
  const version = existing ? (db.prepare('SELECT MAX(version) as v FROM review_history WHERE receipt_id = ?').get(receiptId) as { v: number | null }).v ?? 0 : 0;

  const tx = db.transaction(() => {
    const reviewId = db.prepare(`
      INSERT INTO review_records
        (receipt_id, batch_id, reviewer, initial_conclusion, manual_conclusion, is_manual_override, override_reason, override_impact, status, needs_material, supplementary_material, review_guidance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      receiptId,
      receipt.batch_id,
      body.reviewer,
      existing?.initial_conclusion ?? (existing?.manual_conclusion ?? '待复核'),
      body.manual_conclusion,
      1,
      body.override_reason,
      body.override_impact,
      body.status,
      body.needs_material ?? null,
      body.supplementary_material ?? null,
      body.review_guidance ?? null
    ).lastInsertRowid as number;

    db.prepare(`
      INSERT INTO review_history
        (review_record_id, receipt_id, version, old_conclusion, new_conclusion, old_status, new_status, change_reason, changed_by, supplementary_material_added, new_note, snapshot_before, snapshot_after)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reviewId,
      receiptId,
      version + 1,
      existing?.manual_conclusion ?? existing?.initial_conclusion ?? null,
      body.manual_conclusion,
      existing?.status ?? 'pending',
      body.status,
      body.override_reason,
      body.reviewer,
      body.supplementary_material ?? null,
      body.review_guidance ?? null,
      existing ? JSON.stringify(existing) : null,
      JSON.stringify({
        conclusion: body.manual_conclusion,
        status: body.status,
        impact: body.override_impact,
      })
    );

    return reviewId;
  });

  const reviewId = tx();
  res.json({ ok: true, review_id: reviewId });
});

app.get('/api/receipts/:receiptId/history', (req: Request, res: Response<ReviewHistory[]>) => {
  const receiptId = Number(req.params.receiptId);
  const rows = db.prepare('SELECT * FROM review_history WHERE receipt_id = ? ORDER BY version ASC').all(receiptId) as ReviewHistory[];
  res.json(rows);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`ABS现金流复核服务已启动: http://localhost:${PORT}`);
});
