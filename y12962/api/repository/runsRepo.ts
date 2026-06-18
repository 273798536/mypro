import { getDb } from '../db/database.js'
import { generateRunId } from '../db/schema.js'
import type { RunRecord, DelayMetric } from '@shared/types'

function mapRun(r: Record<string, unknown>): RunRecord {
  return {
    id: r.id as number,
    runId: r.run_id as string,
    sourceDb: r.source_db as string,
    startedAt: r.started_at as string,
    completedAt: (r.completed_at as string) ?? null,
    status: r.status as RunRecord['status'],
    delayCount: r.delay_count as number,
    schemaDiffCount: r.schema_diff_count as number,
    indexSuggestionCount: r.index_suggestion_count as number,
    issueCount: r.issue_count as number,
  }
}

export function listRuns(): RunRecord[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM runs ORDER BY started_at DESC').all() as Record<string, unknown>[]
  return rows.map(mapRun)
}

export function getRun(runId: string): RunRecord | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM runs WHERE run_id = ?').get(runId) as Record<string, unknown> | undefined
  return row ? mapRun(row) : null
}

export function getLatestTwoRuns(): RunRecord[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM runs ORDER BY started_at DESC LIMIT 2').all() as Record<string, unknown>[]
  return rows.map(mapRun)
}

export function createRun(sourceDb: string): RunRecord {
  const db = getDb()
  const runId = generateRunId()
  const startedAt = new Date().toISOString()
  db.prepare(
    'INSERT INTO runs (run_id, source_db, started_at, status) VALUES (?, ?, ?, ?)'
  ).run(runId, sourceDb, startedAt, 'running')
  const row = db.prepare('SELECT * FROM runs WHERE run_id = ?').get(runId) as Record<string, unknown>
  return mapRun(row)
}

export function completeRun(runId: string, counts: { delay: number; schemaDiff: number; indexSuggestion: number; issue: number }): void {
  const db = getDb()
  db.prepare(
    `UPDATE runs SET completed_at = ?, status = 'completed', delay_count = ?, schema_diff_count = ?, index_suggestion_count = ?, issue_count = ? WHERE run_id = ?`
  ).run(new Date().toISOString(), counts.delay, counts.schemaDiff, counts.indexSuggestion, counts.issue, runId)
}

export function listDelayMetrics(runId: string): DelayMetric[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM delay_metrics WHERE run_id = ? ORDER BY delay_seconds DESC').all(runId) as Record<string, unknown>[]
  return rows.map((r) => ({
    id: r.id as number,
    runId: r.run_id as string,
    dbInstance: r.db_instance as string,
    masterLsn: (r.master_lsn as string) ?? null,
    replicaLsn: (r.replica_lsn as string) ?? null,
    delaySeconds: r.delay_seconds as number,
    thresholdSeconds: r.threshold_seconds as number,
    capturedAt: r.captured_at as string,
  }))
}
