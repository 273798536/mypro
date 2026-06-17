import type {
  OverviewStats,
  Slice,
  Review,
  TraceChain,
  IoGuide,
  ExportPayload,
  ReconcileResult,
  ImportResult,
  ImportBatch,
} from '../../shared/types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const json = await res.json()
  if (!res.ok || !json.success) {
    throw new Error(json.error || `请求失败: ${res.status}`)
  }
  return json.data as T
}

export const api = {
  overview: () => request<OverviewStats>('/api/stats/overview'),
  slices: (filter: string) => request<Slice[]>(`/api/slices?filter=${filter}`),
  samples: () =>
    request<{ normal: Slice | null; edge: Slice | null; bad: Slice | null }>('/api/slices/samples'),
  reviews: () => request<Review[]>('/api/reviews'),
  resolveReview: (id: string, conclusion: string) =>
    request<Review>(`/api/reviews/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ conclusion }),
    }),
  trace: (recordId: string) => request<TraceChain>(`/api/trace/${recordId}`),
  guide: () => request<IoGuide>('/api/io/guide'),
  imports: () => request<ImportBatch[]>('/api/io/imports'),
  doImport: (body: {
    batchName: string
    sourcePath: string
    items: { content: string; eval_bank?: string; seg_list?: string }[]
  }) =>
    request<ImportResult>('/api/io/import', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  exportData: () => request<ExportPayload>('/api/io/export'),
  reconcile: () => request<ReconcileResult>('/api/io/reconcile'),
}
