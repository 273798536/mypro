import { randomUUID } from 'crypto';
import { getDb } from '../db.js';
import { readProcessingRecords } from './processingRecord.js';
import { buildReportHtml } from '../lib/reportBuilder.js';
import type { ReportRecord } from '../../shared/types.js';

function rowToReport(row: any): ReportRecord {
  return {
    id: row.id,
    batchId: row.batch_id,
    html: row.html,
    generatedAt: row.generated_at,
  };
}

export function generateReport(batchId: string): ReportRecord {
  const record = readProcessingRecords(batchId);
  const html = buildReportHtml({
    batch: record.batch,
    conclusion: record.conclusion,
    anomalies: record.anomalies,
    splitList: record.splitList,
  });
  const db = getDb();
  const id = randomUUID();
  const t = new Date().toISOString();
  db.prepare(
    `INSERT INTO report (id, batch_id, html, generated_at) VALUES (?, ?, ?, ?)`,
  ).run(id, batchId, html, t);
  return { id, batchId, html, generatedAt: t };
}

export function getLatestReport(batchId: string): ReportRecord | null {
  const db = getDb();
  const row = db.prepare(
    `SELECT * FROM report WHERE batch_id = ? ORDER BY generated_at DESC LIMIT 1`,
  ).get(batchId) as any;
  return row ? rowToReport(row) : null;
}
