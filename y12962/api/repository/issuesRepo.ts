import { getDb } from '../db/database.js'
import type {
  Issue, IssueType, IssueStatus, SchemaDiff, IndexSuggestion,
  PermissionRow, HandlingOpinion, ReviewHistory,
} from '@shared/types'

function mapIssue(r: Record<string, unknown>): Issue {
  return {
    id: r.id as number,
    runId: r.run_id as string,
    type: r.type as IssueType,
    severity: r.severity as Issue['severity'],
    status: r.status as IssueStatus,
    dbInstance: r.db_instance as string,
    schemaName: (r.schema_name as string) ?? null,
    tableName: (r.table_name as string) ?? null,
    detail: r.detail as string,
    detectedAt: r.detected_at as string,
  }
}

export interface IssueFilter {
  runId?: string
  type?: IssueType
  status?: IssueStatus
}

export function listIssues(filter: IssueFilter = {}): Issue[] {
  const db = getDb()
  const clauses: string[] = []
  const params: string[] = []
  if (filter.runId) { clauses.push('run_id = ?'); params.push(filter.runId) }
  if (filter.type) { clauses.push('type = ?'); params.push(filter.type) }
  if (filter.status) { clauses.push('status = ?'); params.push(filter.status) }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const rows = db.prepare(`SELECT * FROM issues ${where} ORDER BY detected_at DESC`).all(...params) as Record<string, unknown>[]
  return rows.map(mapIssue)
}

export function getIssue(issueId: number): Issue | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM issues WHERE id = ?').get(issueId) as Record<string, unknown> | undefined
  return row ? mapIssue(row) : null
}

export function createIssue(data: {
  runId: string; type: IssueType; severity: Issue['severity']; status: IssueStatus;
  dbInstance: string; schemaName: string | null; tableName: string | null; detail: string; detectedAt: string;
}): number {
  const db = getDb()
  const res = db.prepare(
    `INSERT INTO issues (run_id, type, severity, status, db_instance, schema_name, table_name, detail, detected_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(data.runId, data.type, data.severity, data.status, data.dbInstance, data.schemaName, data.tableName, data.detail, data.detectedAt) as { lastInsertRowid: number | bigint }
  return Number(res.lastInsertRowid)
}

export function updateIssueStatus(issueId: number, status: IssueStatus): void {
  const db = getDb()
  db.prepare('UPDATE issues SET status = ? WHERE id = ?').run(status, issueId)
}

export function getSchemaDiffByIssue(issueId: number): SchemaDiff | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM schema_diffs WHERE issue_id = ?').get(issueId) as Record<string, unknown> | undefined
  if (!row) return null
  return {
    id: row.id as number, runId: row.run_id as string, issueId: (row.issue_id as number) ?? null,
    objectType: row.object_type as string, objectName: row.object_name as string,
    masterDef: (row.master_def as string) ?? null, replicaDef: (row.replica_def as string) ?? null,
    diffSummary: (row.diff_summary as string) ?? null,
  }
}

export function listSchemaDiffsByRun(runId: string): SchemaDiff[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM schema_diffs WHERE run_id = ?').all(runId) as Record<string, unknown>[]
  return rows.map((r) => ({
    id: r.id as number, runId: r.run_id as string, issueId: (r.issue_id as number) ?? null,
    objectType: r.object_type as string, objectName: r.object_name as string,
    masterDef: (r.master_def as string) ?? null, replicaDef: (r.replica_def as string) ?? null,
    diffSummary: (r.diff_summary as string) ?? null,
  }))
}

export function getIndexSuggestionByIssue(issueId: number): IndexSuggestion | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM index_suggestions WHERE issue_id = ?').get(issueId) as Record<string, unknown> | undefined
  if (!row) return null
  return {
    id: row.id as number, runId: row.run_id as string, issueId: (row.issue_id as number) ?? null,
    tableName: row.table_name as string, columns: row.columns as string,
    adviceType: row.advice_type as IndexSuggestion['adviceType'],
    reason: (row.reason as string) ?? null, impact: (row.impact as string) ?? null,
  }
}

export function listIndexSuggestionsByRun(runId: string): IndexSuggestion[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM index_suggestions WHERE run_id = ?').all(runId) as Record<string, unknown>[]
  return rows.map((r) => ({
    id: r.id as number, runId: r.run_id as string, issueId: (r.issue_id as number) ?? null,
    tableName: r.table_name as string, columns: r.columns as string,
    adviceType: r.advice_type as IndexSuggestion['adviceType'],
    reason: (r.reason as string) ?? null, impact: (r.impact as string) ?? null,
  }))
}

export function listPermissionsByRun(runId: string): PermissionRow[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM permissions WHERE run_id = ? ORDER BY db_user').all(runId) as Record<string, unknown>[]
  return rows.map((r) => ({
    id: r.id as number, runId: r.run_id as string, dbUser: r.db_user as string, host: r.host as string,
    privileges: r.privileges as string, grantedBy: (r.granted_by as string) ?? null, grantedAt: (r.granted_at as string) ?? null,
  }))
}

export function listHandlingOpinions(issueId: number): HandlingOpinion[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM handling_opinions WHERE issue_id = ? ORDER BY created_at').all(issueId) as Record<string, unknown>[]
  return rows.map((r) => ({
    id: r.id as number, issueId: r.issue_id as number, opinionText: r.opinion_text as string,
    recommendedAction: r.recommended_action as string, priority: r.priority as HandlingOpinion['priority'],
    createdBy: (r.created_by as string) ?? null, createdAt: r.created_at as string,
  }))
}

export function createHandlingOpinion(data: {
  issueId: number; opinionText: string; recommendedAction: string; priority: HandlingOpinion['priority']; createdBy: string;
}): void {
  const db = getDb()
  db.prepare(
    `INSERT INTO handling_opinions (issue_id, opinion_text, recommended_action, priority, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(data.issueId, data.opinionText, data.recommendedAction, data.priority, data.createdBy, new Date().toISOString())
}

export function listReviewHistory(issueId: number): ReviewHistory[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM review_history WHERE issue_id = ? ORDER BY changed_at').all(issueId) as Record<string, unknown>[]
  return rows.map((r) => ({
    id: r.id as number, issueId: r.issue_id as number, reviewer: r.reviewer as string,
    action: r.action as ReviewHistory['action'], reason: (r.reason as string) ?? null,
    previousStatus: (r.previous_status as IssueStatus) ?? null, changedAt: r.changed_at as string,
  }))
}

export function createReviewHistory(data: {
  issueId: number; reviewer: string; action: ReviewHistory['action']; reason: string; previousStatus: IssueStatus | null;
}): void {
  const db = getDb()
  db.prepare(
    `INSERT INTO review_history (issue_id, reviewer, action, reason, previous_status, changed_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(data.issueId, data.reviewer, data.action, data.reason, data.previousStatus, new Date().toISOString())
}
