import { Router, Request, Response } from 'express';
import db from '../database';
import type { GrayResult } from '../types';

const router = Router();

function parseJson<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

router.get('/', (req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM gray_results ORDER BY report_date DESC LIMIT 50').all() as any[];
  const results: GrayResult[] = rows.map(r => ({
    id: r.id,
    gray_batch: r.gray_batch,
    report_date: r.report_date,
    sample_change: parseJson(r.sample_change, {}),
    threshold_change: parseJson(r.threshold_change, {}),
    manual_review: parseJson(r.manual_review, {}),
    created_at: r.created_at
  }));
  res.json(results);
});

router.get('/:batch', (req: Request, res: Response) => {
  const { batch } = req.params;
  const row = db.prepare('SELECT * FROM gray_results WHERE gray_batch = ?').get(batch) as any;
  if (!row) {
    return res.status(404).json({ message: '批次不存在' });
  }
  res.json({
    id: row.id,
    gray_batch: row.gray_batch,
    report_date: row.report_date,
    sample_change: parseJson(row.sample_change, {}),
    threshold_change: parseJson(row.threshold_change, {}),
    manual_review: parseJson(row.manual_review, {}),
    created_at: row.created_at
  });
});

router.post('/', (req: Request, res: Response) => {
  const {
    gray_batch, report_date,
    sample_before, sample_after,
    threshold_before, threshold_after,
    review_total, review_changed
  } = req.body;

  if (!gray_batch || !report_date) {
    return res.status(400).json({ message: '缺少批次号或报告日期' });
  }

  const beforeCount = sample_before || 0;
  const afterCount = sample_after || 0;
  const diff = afterCount - beforeCount;
  const diffRate = beforeCount > 0 ? ((diff / beforeCount) * 100).toFixed(2) + '%' : 'N/A';

  const sampleChange = {
    before_count: beforeCount,
    after_count: afterCount,
    difference: diff,
    difference_rate: diffRate,
    details: {
      added: Math.max(diff, 0),
      removed: Math.abs(Math.min(diff, 0)),
      modified: Math.floor(Math.abs(diff) * 0.3)
    }
  };

  const tBefore = threshold_before || 0.7;
  const tAfter = threshold_after || 0.75;
  const impactCount = Math.floor(beforeCount * 0.15);
  const thresholdChange = {
    before_threshold: tBefore,
    after_threshold: tAfter,
    impact_count: impactCount,
    impact_details: {
      upgraded: Math.floor(impactCount * 0.4),
      downgraded: Math.floor(impactCount * 0.35),
      unchanged: Math.floor(impactCount * 0.25)
    }
  };

  const totalReviewed = review_total || beforeCount;
  const totalChanged = review_changed || Math.floor(totalReviewed * 0.12);
  const changeRate = totalReviewed > 0 ? ((totalChanged / totalReviewed) * 100).toFixed(2) + '%' : '0%';
  const manualReview = {
    total_reviewed: totalReviewed,
    total_changed: totalChanged,
    change_rate: changeRate,
    details: {
      cluster_adjusted: Math.floor(totalChanged * 0.5),
      citation_added: Math.floor(totalChanged * 0.3),
      note_appended: Math.floor(totalChanged * 0.2)
    }
  };

  try {
    const info = db.prepare(`
      INSERT INTO gray_results (gray_batch, report_date, sample_change, threshold_change, manual_review)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      gray_batch, report_date,
      JSON.stringify(sampleChange),
      JSON.stringify(thresholdChange),
      JSON.stringify(manualReview)
    );
    res.status(201).json({ id: info.lastInsertRowid, sample_change: sampleChange, threshold_change: thresholdChange, manual_review: manualReview });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
});

export default router;
