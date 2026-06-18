export type IssueType = 'lock_wait' | 'schema_diff' | 'index_invalid'
export type Severity = 'critical' | 'warning' | 'info'
export type IssueStatus = 'pending' | 'approved' | 'rejected'
export type RunStatus = 'running' | 'completed' | 'failed'
export type AdviceType = 'add' | 'drop' | 'invalid'
export type ReviewAction = 'approve' | 'reject' | 'comment'

export interface RunRecord {
  id: number
  runId: string
  sourceDb: string
  startedAt: string
  completedAt: string | null
  status: RunStatus
  delayCount: number
  schemaDiffCount: number
  indexSuggestionCount: number
  issueCount: number
}

export interface DelayMetric {
  id: number
  runId: string
  dbInstance: string
  masterLsn: string | null
  replicaLsn: string | null
  delaySeconds: number
  thresholdSeconds: number
  capturedAt: string
}

export interface Issue {
  id: number
  runId: string
  type: IssueType
  severity: Severity
  status: IssueStatus
  dbInstance: string
  schemaName: string | null
  tableName: string | null
  detail: string
  detectedAt: string
}

export interface SchemaDiff {
  id: number
  runId: string
  issueId: number | null
  objectType: string
  objectName: string
  masterDef: string | null
  replicaDef: string | null
  diffSummary: string | null
}

export interface IndexSuggestion {
  id: number
  runId: string
  issueId: number | null
  tableName: string
  columns: string
  adviceType: AdviceType
  reason: string | null
  impact: string | null
}

export interface PermissionRow {
  id: number
  runId: string
  dbUser: string
  host: string
  privileges: string
  grantedBy: string | null
  grantedAt: string | null
}

export interface HandlingOpinion {
  id: number
  issueId: number
  opinionText: string
  recommendedAction: string
  priority: Severity
  createdBy: string | null
  createdAt: string
}

export interface ReviewHistory {
  id: number
  issueId: number
  reviewer: string
  action: ReviewAction
  reason: string | null
  previousStatus: IssueStatus | null
  changedAt: string
}

export interface IssueTrace {
  issue: Issue
  run: RunRecord
  schemaDiff: SchemaDiff | null
  indexSuggestion: IndexSuggestion | null
  permissions: PermissionRow[]
  handlingOpinions: HandlingOpinion[]
  reviewHistory: ReviewHistory[]
}

export interface RunSummary {
  counts: {
    pending: number
    approved: number
    rejected: number
    byType: Record<IssueType, number>
  }
  approvalRate: number
}

export interface ReviewRequest {
  reviewer: string
  action: 'approve' | 'reject'
  reason: string
}

export const ISSUE_TYPE_LABEL: Record<IssueType, string> = {
  lock_wait: '锁等待过长',
  schema_diff: 'Schema 差异',
  index_invalid: '索引失效',
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: '严重',
  warning: '警告',
  info: '提示',
}
