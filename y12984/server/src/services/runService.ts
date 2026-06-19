import { db } from '../db';
import { Run } from '../types';

export function createRun(filename: string): Run {
  const now = new Date().toISOString();
  const runName = `评估运行_${new Date().toISOString().slice(0, 10)}_${Date.now()}`;
  const stmt = db.prepare(
    'INSERT INTO runs (run_name, import_time, filename, total_records, anomaly_count, status) VALUES (?, ?, ?, 0, 0, ?)'
  );
  const result = stmt.run(runName, now, filename, 'processing');
  return getRun(result.lastInsertRowid as number) as Run;
}

export function updateRunStats(runId: number): void {
  const total = db
    .prepare('SELECT COUNT(*) as cnt FROM report_records WHERE run_id = ?')
    .get(runId) as { cnt: number };
  const anomaly = db
    .prepare(
      `SELECT COUNT(DISTINCT a.record_id) as cnt FROM anomalies a
       JOIN report_records r ON a.record_id = r.id
       WHERE r.run_id = ? AND a.status != 'resolved'`
    )
    .get(runId) as { cnt: number };
  db.prepare('UPDATE runs SET total_records = ?, anomaly_count = ?, status = ? WHERE id = ?').run(
    total.cnt,
    anomaly.cnt,
    'completed',
    runId
  );
}

export function getRuns(): Run[] {
  return db.prepare('SELECT * FROM runs ORDER BY import_time DESC').all() as Run[];
}

export function getRun(id: number): Run | undefined {
  return db.prepare('SELECT * FROM runs WHERE id = ?').get(id) as Run | undefined;
}

export function deleteRun(id: number): void {
  db.prepare('DELETE FROM runs WHERE id = ?').run(id);
}
