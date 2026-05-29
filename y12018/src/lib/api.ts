const API_BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, options)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  return response.json()
}

export const api = {
  getEvents: () => request<{ id: string; name: string }[]>('/events'),
  getBatches: (eventId?: string) =>
    request<import('../../shared/types.ts').Batch[]>(`/batches${eventId ? `?event_id=${eventId}` : ''}`),
  getDistributions: (params: {
    event_id?: string
    batch_id?: string
    status?: string
    has_tied_rank?: boolean
    has_dispute?: boolean
    has_duplicate_resend?: boolean
    page?: number
    page_size?: number
  }) => {
    const search = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== false) {
        search.append(k, String(v))
      }
    })
    return request<{
      total: number
      data: import('../../shared/types.ts').Distribution[]
      bad_rows: import('../../shared/types.ts').BadRow[]
      tied_rank_groups: import('../../shared/types.ts').TiedRankGroup[]
    }>(`/distributions?${search.toString()}`)
  },
  getDistributionDetail: (id: string) =>
    request<import('../../shared/types.ts').DistributionDetail>(`/distributions/${id}`),
  correctDistribution: (id: string, data: import('../../shared/types.ts').CorrectionRequest) =>
    request<{
      correction: import('../../shared/types.ts').Correction
      distribution: import('../../shared/types.ts').Distribution
    }>(`/distributions/${id}/correct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  getCorrections: (params: {
    batch_id?: string
    player_name?: string
    operation_type?: string
    start_date?: string
    end_date?: string
    page?: number
    page_size?: number
  }) => {
    const search = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        search.append(k, String(v))
      }
    })
    return request<{
      total: number
      data: import('../../shared/types.ts').CorrectionWithDistribution[]
    }>(`/corrections?${search.toString()}`)
  },
  exportCSV: (includeBadRows: boolean, eventId?: string) => {
    const search = new URLSearchParams()
    if (includeBadRows) search.append('include_bad_rows', 'true')
    if (eventId) search.append('event_id', eventId)
    return `${API_BASE}/export?${search.toString()}`
  },
}
