import { randomUUID } from 'crypto';
import { getDb } from '../db.js';
import { computeFingerprint } from '../lib/fingerprint.js';
import { computeConsistency } from '../lib/consistency.js';
import { detectAnomalies } from '../lib/anomalyDetector.js';
import { STATUS_FLOW, nextStatus } from '../../shared/types.js';
import type {
  ImportRequest,
  ImportResponse,
  Batch,
  BatchDetail,
  Conclusion,
  DashboardSummary,
  BatchStatus,
  BatchSummary,
} from '../../shared/types.js';

function now() { return new Date().toISOString(); }

function rowToBatch(row: any): Batch {
  return {
    id: row.id,
    batchNo: row.batch_no,
    fingerprint: row.fingerprint,
    sourceFileName: row.source_file_name,
    status: row.status,
    sampleCount: row.sample_count,
    agreementRate: row.agreement_rate,
    kappa: row.kappa,
    anomalyCount: row.anomaly_count,
    conclusionText: row.conclusion_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function importBatch(req: ImportRequest): ImportResponse {
  const db = getDb();
  const fingerprint = computeFingerprint(req.samples);

  const existing = db.prepare('SELECT * FROM batch WHERE fingerprint = ?').get(fingerprint) as any;
  if (existing) {
    const batch = rowToBatch(existing);
    const summary: BatchSummary = {
      sampleCount: batch.sampleCount,
      agreementRate: batch.agreementRate,
      kappa: batch.kappa,
      anomalyCount: batch.anomalyCount,
      conclusionText: batch.conclusionText,
    };
    return { batchId: batch.id, fingerprint, reused: true, status: batch.status, summary };
  }

  const consistency = computeConsistency(req.samples);
  const anomalies = detectAnomalies(req.samples, consistency);

  const tx = db.transaction(() => {
    const batchId = randomUUID();
    const t = now();
    db.prepare(
      `INSERT INTO batch (id, batch_no, fingerprint, source_file_name, status, sample_count,
         agreement_rate, kappa, anomaly_count, conclusion_text, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'IMPORTED', ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      batchId,
      req.batchNo,
      fingerprint,
      req.sourceFileName || null,
      req.samples.length,
      consistency.agreementRate,
      consistency.kappa,
      anomalies.length,
      consistency.conclusionText,
      t,
      t,
    );

    const insertSample = db.prepare(
      `INSERT INTO sample (id, batch_id, sample_key, content, split_tag) VALUES (?, ?, ?, ?, ?)`,
    );
    const insertAnn = db.prepare(
      `INSERT INTO annotation (id, sample_id, annotator, label) VALUES (?, ?, ?, ?)`,
    );
    for (const s of req.samples) {
      const sid = randomUUID();
      insertSample.run(sid, batchId, s.sampleKey, s.content, s.splitTag);
      for (const a of s.annotations) {
        insertAnn.run(randomUUID(), sid, a.annotator, a.label);
      }
    }

    const concId = randomUUID();
    db.prepare(
      `INSERT INTO conclusion (id, batch_id, summary, per_annotator_json, computed_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(concId, batchId, consistency.conclusionText, JSON.stringify(consistency.perAnnotator), t);

    const insertAnom = db.prepare(
      `INSERT INTO anomaly (id, batch_id, sample_id, type, severity, status, title, description, trace_json)
       VALUES (?, ?, ?, ?, ?, 'OPEN', ?, ?, ?)`,
    );
    for (const anom of anomalies) {
      const sampleRow = db.prepare(
        `SELECT id FROM sample WHERE batch_id = ? AND sample_key = ?`,
      ).get(batchId, anom.sampleKey) as any;
      if (!sampleRow) continue;
      insertAnom.run(
        randomUUID(),
        batchId,
        sampleRow.id,
        anom.type,
        anom.severity,
        anom.title,
        anom.description,
        JSON.stringify(anom.trace),
      );
    }

    return batchId;
  });

  const batchId = tx();
  const batchRow = db.prepare('SELECT * FROM batch WHERE id = ?').get(batchId) as any;
  const batch = rowToBatch(batchRow);
  return {
    batchId,
    fingerprint,
    reused: false,
    status: batch.status,
    summary: {
      sampleCount: batch.sampleCount,
      agreementRate: batch.agreementRate,
      kappa: batch.kappa,
      anomalyCount: batch.anomalyCount,
      conclusionText: batch.conclusionText,
    },
  };
}

export function listBatches(params?: { status?: BatchStatus; q?: string }): Batch[] {
  const db = getDb();
  let sql = 'SELECT * FROM batch WHERE 1=1';
  const args: any[] = [];
  if (params?.status) {
    sql += ' AND status = ?';
    args.push(params.status);
  }
  if (params?.q) {
    sql += ' AND batch_no LIKE ?';
    args.push(`%${params.q}%`);
  }
  sql += ' ORDER BY created_at DESC';
  const rows = db.prepare(sql).all(...args) as any[];
  return rows.map(rowToBatch);
}

export function getBatchDetail(id: string): BatchDetail {
  const db = getDb();
  const batchRow = db.prepare('SELECT * FROM batch WHERE id = ?').get(id) as any;
  if (!batchRow) throw new Error('批次不存在');
  const batch = rowToBatch(batchRow);
  const concRow = db.prepare('SELECT * FROM conclusion WHERE batch_id = ?').get(id) as any;
  const conclusion: Conclusion = concRow
    ? {
        id: concRow.id,
        batchId: concRow.batch_id,
        summary: concRow.summary,
        perAnnotator: JSON.parse(concRow.per_annotator_json || '[]'),
        computedAt: concRow.computed_at,
      }
    : { id: '', batchId: id, summary: '', perAnnotator: [], computedAt: '' };
  return { batch, conclusion };
}

export function advanceStatus(id: string, next: BatchStatus): Batch {
  const db = getDb();
  const row = db.prepare('SELECT status FROM batch WHERE id = ?').get(id) as any;
  if (!row) throw new Error('批次不存在');
  const current = row.status as BatchStatus;
  const currentIdx = STATUS_FLOW.indexOf(current);
  const nextIdx = STATUS_FLOW.indexOf(next);
  if (nextIdx < 0) throw new Error('目标状态无效');
  if (nextIdx <= currentIdx) throw new Error('状态不可回退');
  if (nextIdx - currentIdx > 1) throw new Error('状态跳级，需逐步推进');
  const t = now();
  db.prepare('UPDATE batch SET status = ?, updated_at = ? WHERE id = ?').run(next, t, id);
  return rowToBatch(db.prepare('SELECT * FROM batch WHERE id = ?').get(id));
}

export function dashboard(): DashboardSummary {
  const db = getDb();
  const totalRow = db.prepare('SELECT COUNT(*) as n FROM batch').get() as any;
  const byStatus: Record<BatchStatus, number> = {
    IMPORTED: 0, REVIEWING: 0, REVIEWED: 0, EXPORTED: 0,
  };
  const rows = db.prepare('SELECT status, COUNT(*) as n FROM batch GROUP BY status').all() as any[];
  for (const r of rows) {
    if (r.status in byStatus) byStatus[r.status as BatchStatus] = r.n;
  }
  const openRow = db.prepare(
    `SELECT COUNT(*) as n FROM anomaly WHERE status = 'OPEN'`,
  ).get() as any;
  const lastRow = db.prepare(
    `SELECT generated_at FROM report ORDER BY generated_at DESC LIMIT 1`,
  ).get() as any;
  return {
    total: totalRow.n,
    byStatus,
    openAnomalies: openRow.n,
    lastExportAt: lastRow?.generated_at,
  };
}
