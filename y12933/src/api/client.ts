import type {
  CompareRow,
  Conclusion,
  ImportResult,
  ReviewFilters,
  ReviewRow,
  Summary,
  VersionInfo,
} from '../../shared/types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const json = await res.json()
  if (!res.ok || !json.success) {
    throw new Error(json.error || `请求失败 (${res.status})`)
  }
  return json.data as T
}

function toQuery(filters: ReviewFilters): string {
  const params = new URLSearchParams()
  if (filters.version) params.set('version', filters.version)
  if (filters.model_version) params.set('model_version', filters.model_version)
  if (filters.conclusion) params.set('conclusion', filters.conclusion)
  if (filters.bias_type) params.set('bias_type', filters.bias_type)
  if (filters.q) params.set('q', filters.q)
  const s = params.toString()
  return s ? `?${s}` : ''
}

export const api = {
  summary(filters: ReviewFilters = {}): Promise<Summary> {
    return request<Summary>(`/api/summary${toQuery(filters)}`)
  },
  records(filters: ReviewFilters = {}): Promise<ReviewRow[]> {
    return request<ReviewRow[]>(`/api/records${toQuery(filters)}`)
  },
  record(id: string): Promise<ReviewRow> {
    return request<ReviewRow>(`/api/records/${encodeURIComponent(id)}`)
  },
  importCsv(csv: string, label?: string): Promise<ImportResult> {
    return request<ImportResult>(`/api/import`, {
      method: 'POST',
      body: JSON.stringify({ csv, label }),
    })
  },
  saveConclusion(
    id: string,
    payload: {
      conclusion: Conclusion
      bias_type?: string | null
      severity?: string | null
      reviewer?: string | null
      feedback?: string | null
    },
  ): Promise<ReviewRow> {
    return request<ReviewRow>(`/api/records/${encodeURIComponent(id)}/conclusion`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  deleteConclusion(id: string): Promise<ReviewRow> {
    return request<ReviewRow>(`/api/records/${encodeURIComponent(id)}/conclusion`, {
      method: 'DELETE',
    })
  },
  versions(): Promise<VersionInfo[]> {
    return request<VersionInfo[]>(`/api/versions`)
  },
  compare(a: string, b: string): Promise<CompareRow[]> {
    return request<CompareRow[]>(`/api/versions/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`)
  },
  meta(): Promise<{
    model_versions: string[]
    bias_types: string[]
    conclusions: string[]
  }> {
    return request(`/api/meta`)
  },
  exportUrl(filters: ReviewFilters = {}): string {
    return `/api/export${toQuery(filters)}`
  },
}
