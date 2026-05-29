const BASE = '/api'

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function convertKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(convertKeys)
  } else if (obj !== null && typeof obj === 'object') {
      const result: any = {}
      for (const key of Object.keys(obj)) {
        result[snakeToCamel(key)] = convertKeys(obj[key])
      }
      return result
    }
  return obj
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || err.error || `HTTP ${res.status}`)
  }
  const json = await res.json()
  const data = json?.data ?? json
  return convertKeys(data) as T
}

export const api = {
  dashboard: {
    stats: () => request<any>('/dashboard/stats'),
    alerts: () => request<any>('/dashboard/alerts'),
    batchProgress: () => request<any>('/dashboard/batch-progress'),
    enterprises: () => request<any>('/dashboard/enterprises'),
    batches: () => request<any>('/dashboard/batches'),
  },
  margin: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request<any>(`/margin/list${qs}`)
    },
    get: (id: string) => request<any>(`/margin/${id}`),
    lock: (data: any) => request<any>('/margin/lock', { method: 'POST', body: JSON.stringify(data) }),
    release: (data: any) => request<any>('/margin/release', { method: 'POST', body: JSON.stringify(data) }),
    crossBatch: (enterpriseId: string) => request<any>(`/margin/enterprise/${enterpriseId}/cross-batch`),
  },
  orders: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request<any>(`/orders${qs}`)
    },
    get: (id: string) => request<any>(`/orders/${id}`),
    overdue: () => request<any>('/orders/overdue'),
    splits: (id: string) => request<any>(`/orders/${id}/splits`),
    trace: (id: string) => request<any>(`/orders/${id}/trace`),
  },
  importData: {
    upload: (formData: FormData) => fetch(`${BASE}/import/upload`, { method: 'POST', body: formData }).then(r => r.json()),
    preview: (id: string) => request<any>(`/import/${id}/preview`),
    badRows: (id: string) => request<any>(`/import/${id}/bad-rows`),
    confirm: (id: string) => request<any>(`/import/${id}/confirm`, { method: 'POST' }),
    restoreBadRow: (id: string) => request<any>(`/import/bad-rows/${id}/restore`, { method: 'POST' }),
    discardBadRow: (id: string) => request<any>(`/import/bad-rows/${id}/discard`, { method: 'POST' }),
  },
  audit: {
    logs: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request<any>(`/audit/logs${qs}`)
    },
    trace: (entityType: string, id: string) => request<any>(`/audit/trace/${entityType}/${id}`),
  },
  reports: {
    generate: (data: any) => request<any>('/reports/generate', { method: 'POST', body: JSON.stringify(data) }),
    list: () => request<any>('/reports'),
    get: (id: string) => request<any>(`/reports/${id}`),
    trace: (id: string, rowId: string) => request<any>(`/reports/${id}/trace/${rowId}`),
  },
}
