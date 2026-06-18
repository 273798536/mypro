import type {
  RunRecord, DelayMetric, Issue, IssueTrace, RunSummary,
  SchemaDiff, IndexSuggestion, ReviewRequest, ReviewHistory,
} from '@shared/types'

const BASE = '/api'

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : {}
  if (!res.ok || !json.success) {
    throw new Error(json.error || `请求失败 ${res.status}`)
  }
  return json.data as T
}

export interface RunDetail {
  run: RunRecord
  delays: DelayMetric[]
  schemaDiffs: SchemaDiff[]
  indexSuggestions: IndexSuggestion[]
  summary: RunSummary
}

export interface LatestPayload {
  current: RunRecord | null
  previous: RunRecord | null
  summary: RunSummary | null
}

export const api = {
  listRuns: () => http<RunRecord[]>('/runs'),
  getLatest: () => http<LatestPayload>('/runs/latest'),
  getRun: (runId: string) => http<RunDetail>(`/runs/${encodeURIComponent(runId)}`),
  triggerRun: (sourceDb?: string) =>
    http<{ runId: string; issueCount: number }>('/runs', {
      method: 'POST',
      body: JSON.stringify({ sourceDb: sourceDb ?? 'rw-cluster-prod' }),
    }),
  listIssues: (params?: { runId?: string; type?: string; status?: string }) => {
    const q = new URLSearchParams()
    if (params?.runId) q.set('runId', params.runId)
    if (params?.type) q.set('type', params.type)
    if (params?.status) q.set('status', params.status)
    const qs = q.toString()
    return http<Issue[]>(`/issues${qs ? `?${qs}` : ''}`)
  },
  traceIssue: (id: number) => http<IssueTrace>(`/issues/${id}`),
  reviewIssue: (id: number, body: ReviewRequest) =>
    http<IssueTrace>(`/issues/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  reviewHistory: (id: number) => http<ReviewHistory[]>(`/issues/${id}/history`),
  downloadUrl: (runId: string) => `${BASE}/download/${encodeURIComponent(runId)}`,
}
