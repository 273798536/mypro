import { randomUUID } from 'crypto';
import { getDb } from '../db.js';
import { readProcessingRecords } from './processingRecord.js';
import type { ComparisonResult, ComparisonMetrics } from '../../shared/types.js';

function computeMetrics(record: { anomalies: any[]; batch: any }): ComparisonMetrics {
  const anomalyCount = record.anomalies.length;
  const resolvedCount = record.anomalies.filter((a: any) => a.status === 'RESOLVED').length;
  const biasCount = record.anomalies.filter((a: any) => a.type === 'DATASET_BIAS').length;
  return {
    agreementRate: record.batch.agreementRate,
    kappa: record.batch.kappa,
    anomalyCount,
    resolvedCount,
    biasCount,
  };
}

export function compareBatches(batchId: string, againstBatchId: string): ComparisonResult {
  if (batchId === againstBatchId) throw new Error('不能与自身对比');
  const current = readProcessingRecords(batchId);
  const against = readProcessingRecords(againstBatchId);

  const result: ComparisonResult = {
    id: '',
    current: { id: current.batch.id, batchNo: current.batch.batchNo, status: current.batch.status },
    against: { id: against.batch.id, batchNo: against.batch.batchNo, status: against.batch.status },
    currentMetrics: computeMetrics(current),
    againstMetrics: computeMetrics(against),
    note: '数据来源：两批既有处理记录，未重复计算',
    createdAt: '',
  };

  const db = getDb();
  const id = randomUUID();
  const t = new Date().toISOString();
  const { id: _id1, ...rest } = result;
  db.prepare(
    `INSERT INTO comparison (id, batch_id, against_batch_id, result_json, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, batchId, againstBatchId, JSON.stringify({ ...rest, id: '', createdAt: '' }), t);

  return { ...result, id, createdAt: t };
}

export function listComparisons(batchId: string): ComparisonResult[] {
  const db = getDb();
  const rows = db.prepare(
    `SELECT * FROM comparison WHERE batch_id = ? ORDER BY created_at DESC`,
  ).all(batchId) as any[];
  return rows.map((r) => {
    const data = JSON.parse(r.result_json || '{}');
    return {
      id: r.id,
      current: data.current,
      against: data.against,
      currentMetrics: data.currentMetrics,
      againstMetrics: data.againstMetrics,
      note: data.note,
      createdAt: r.created_at,
    };
  });
}
