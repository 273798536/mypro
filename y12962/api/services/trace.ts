import { getDb } from '../db/database.js'
import { getRun } from '../repository/runsRepo.js'
import {
  getIssue, getSchemaDiffByIssue, getIndexSuggestionByIssue,
  listPermissionsByRun, listHandlingOpinions, listReviewHistory,
} from '../repository/issuesRepo.js'
import type { IssueTrace, RunSummary, IssueType, IssueStatus } from '@shared/types'

export function traceIssue(issueId: number): IssueTrace | null {
  const issue = getIssue(issueId)
  if (!issue) return null
  const run = getRun(issue.runId)
  if (!run) return null
  const schemaDiff = issue.type === 'schema_diff' ? getSchemaDiffByIssue(issueId) : null
  const indexSuggestion = issue.type === 'index_invalid' ? getIndexSuggestionByIssue(issueId) : null
  const permissions = listPermissionsByRun(issue.runId)
  const handlingOpinions = listHandlingOpinions(issueId)
  const reviewHistory = listReviewHistory(issueId)
  return {
    issue, run, schemaDiff, indexSuggestion, permissions, handlingOpinions, reviewHistory,
  }
}

export function summarizeRun(runId: string): RunSummary {
  const db = getDb()
  const rows = db.prepare(
    `SELECT type, status, COUNT(*) AS c FROM issues WHERE run_id = ? GROUP BY type, status`
  ).all(runId) as { type: IssueType; status: IssueStatus; c: number }[]
  const byType: Record<IssueType, number> = { lock_wait: 0, schema_diff: 0, index_invalid: 0 }
  let pending = 0
  let approved = 0
  let rejected = 0
  for (const r of rows) {
    byType[r.type] += r.c
    if (r.status === 'pending') pending += r.c
    else if (r.status === 'approved') approved += r.c
    else if (r.status === 'rejected') rejected += r.c
  }
  const total = pending + approved + rejected
  const approvalRate = total > 0 ? Math.round((approved / total) * 1000) / 10 : 0
  return { counts: { pending, approved, rejected, byType }, approvalRate }
}
