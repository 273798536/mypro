import { getDb } from '../db.js';
import type { Batch, Conclusion, Anomaly, SplitItem } from '../../shared/types.js';

export interface ProcessingRecord {
  batch: Batch;
  conclusion: Conclusion;
  anomalies: Anomaly[];
  splitList: { trainCount: number; evalCount: number; items: SplitItem[] };
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

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

export function readProcessingRecords(batchId: string): ProcessingRecord {
  const db = getDb();

  const batchRow = db.prepare('SELECT * FROM batch WHERE id = ?').get(batchId);
  if (!batchRow) throw new Error('批次不存在');
  const batch = rowToBatch(batchRow);

  const concRow = db.prepare('SELECT * FROM conclusion WHERE batch_id = ?').get(batchId) as Record<string, any> | undefined;
  const conclusion: Conclusion = concRow
    ? {
        id: concRow.id,
        batchId: concRow.batch_id,
        summary: concRow.summary,
        perAnnotator: parseJson(concRow.per_annotator_json, []),
        computedAt: concRow.computed_at,
      }
    : { id: '', batchId: batchId, summary: '', perAnnotator: [], computedAt: '' };

  const anomalyRows = db.prepare('SELECT * FROM anomaly WHERE batch_id = ? ORDER BY type, id').all(batchId);
  const opinionRows = db.prepare(
    `SELECT o.* FROM opinion o
     JOIN anomaly a ON a.id = o.anomaly_id
     WHERE a.batch_id = ?`,
  ).all(batchId) as any[];
  const opinionMap = new Map<string, any>();
  for (const o of opinionRows) opinionMap.set(o.anomaly_id, o);

  const sampleRows = db.prepare(
    `SELECT s.id, s.sample_key, s.content, s.split_tag,
            json_group_array(json_object('annotator', a.annotator, 'label', a.label)) as annotations_json
     FROM sample s
     LEFT JOIN annotation a ON a.sample_id = s.id
     WHERE s.batch_id = ?
     GROUP BY s.id
     ORDER BY s.sample_key`,
  ).all(batchId) as any[];

  const items: SplitItem[] = sampleRows.map((s) => {
    const anns = parseJson<any[]>(s.annotations_json, []);
    const label = anns[0]?.label;
    return { sampleKey: s.sample_key, splitTag: s.split_tag, label };
  });
  const trainCount = items.filter((i) => i.splitTag === 'train').length;
  const evalCount = items.filter((i) => i.splitTag === 'eval').length;

  const anomalies: Anomaly[] = anomalyRows.map((row: any) => {
    const trace = parseJson<any>(row.trace_json, {});
    const op = opinionMap.get(row.id);
    return {
      id: row.id,
      batchId: row.batch_id,
      sampleId: row.sample_id,
      type: row.type,
      severity: row.severity,
      status: row.status,
      title: row.title,
      description: row.description,
      trace,
      opinion: op
        ? { action: op.action, text: op.text, reviewer: op.reviewer, createdAt: op.created_at }
        : undefined,
    };
  });

  return {
    batch,
    conclusion,
    anomalies,
    splitList: { trainCount, evalCount, items },
  };
}
