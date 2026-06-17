import { randomUUID } from 'crypto';
import { getDb } from '../db.js';
import type { Anomaly, AnomalyType, AnomalyStatus, OpinionAction } from '../../shared/types.js';

function rowToAnomaly(row: any): Anomaly {
  const trace = JSON.parse(row.trace_json || '{}');
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
    opinion: undefined,
  };
}

function attachOpinion(anomaly: Anomaly): Anomaly {
  const db = getDb();
  const opRow = db.prepare('SELECT * FROM opinion WHERE anomaly_id = ?').get(anomaly.id) as any;
  if (opRow) {
    anomaly.opinion = {
      action: opRow.action,
      text: opRow.text,
      reviewer: opRow.reviewer,
      createdAt: opRow.created_at,
    };
  }
  return anomaly;
}

export function listByBatch(
  batchId: string,
  params?: { type?: AnomalyType; status?: AnomalyStatus },
): Anomaly[] {
  const db = getDb();
  let sql = 'SELECT * FROM anomaly WHERE batch_id = ?';
  const args: any[] = [batchId];
  if (params?.type) {
    sql += ' AND type = ?';
    args.push(params.type);
  }
  if (params?.status) {
    sql += ' AND status = ?';
    args.push(params.status);
  }
  sql += ' ORDER BY type, id';
  const rows = db.prepare(sql).all(...args) as any[];
  return rows.map((r) => attachOpinion(rowToAnomaly(r)));
}

export function getAnomaly(id: string): Anomaly {
  const db = getDb();
  const row = db.prepare('SELECT * FROM anomaly WHERE id = ?').get(id) as any;
  if (!row) throw new Error('异常不存在');
  return attachOpinion(rowToAnomaly(row));
}

export function reviewAnomaly(
  id: string,
  body: { action?: OpinionAction; text?: string; reviewer?: string; status?: AnomalyStatus },
): Anomaly {
  const db = getDb();
  const row = db.prepare('SELECT id FROM anomaly WHERE id = ?').get(id);
  if (!row) throw new Error('异常不存在');

  const tx = db.transaction(() => {
    if (body.action || body.text || body.reviewer) {
      const existing = db.prepare('SELECT id FROM opinion WHERE anomaly_id = ?').get(id);
      const t = new Date().toISOString();
      if (existing) {
        db.prepare(
          `UPDATE opinion SET action = COALESCE(?, action),
            text = COALESCE(?, text),
            reviewer = COALESCE(?, reviewer),
            created_at = ?
           WHERE anomaly_id = ?`,
        ).run(body.action || null, body.text || null, body.reviewer || null, t, id);
      } else {
        if (!body.action || !body.reviewer) {
          throw new Error('首次填写处理意见需同时指定 action 与 reviewer');
        }
        db.prepare(
          `INSERT INTO opinion (id, anomaly_id, action, text, reviewer, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).run(randomUUID(), id, body.action, body.text || '', body.reviewer, t);
      }
    }
    if (body.status) {
      db.prepare('UPDATE anomaly SET status = ? WHERE id = ?').run(body.status, id);
    }
  });
  tx();
  return getAnomaly(id);
}
