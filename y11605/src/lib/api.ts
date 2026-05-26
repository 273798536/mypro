import type {
  Participant,
  RefundBatch,
  RefundRule,
  AuditLog,
  ExportRecord,
  UpdateParticipantRequest,
  CreateBatchRequest,
  CalculateRequest,
} from '../../shared/types'

const API_BASE = '/api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: '请求失败' }))
    throw new Error(data.error || `HTTP ${res.status}`)
  }

  return res.json()
}

export const api = {
  participants: {
    list: (params?: {
      tierId?: string
      payChannel?: string
      status?: string
      hasAnomalies?: boolean
      search?: string
      page?: number
      pageSize?: number
    }) => {
      const query = new URLSearchParams()
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            query.append(k, String(v))
          }
        })
      }
      return request<{ participants: Participant[]; total: number }>(
        `/participants?${query.toString()}`
      )
    },

    get: (id: string) => request<Participant>(`/participants/${id}`),

    update: (id: string, data: UpdateParticipantRequest) =>
      request<Participant>(`/participants/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    stats: () =>
      request<{
        counts: {
          total: number
          pending: number
          calculated: number
          confirmed: number
          frozen: number
          refunded: number
          withAnomalies: number
        }
        amounts: {
          totalPayAmount: number
          totalRefundAmount: number
          totalFeeAmount: number
          totalActualRefund: number
        }
      }>('/participants/stats'),

    tiers: () =>
      request<
        {
          tierId: string
          tierName: string
          count: number
          totalAmount: number
        }[]
      >('/participants/tiers'),

    history: (id: string) => request<AuditLog[]>(`/participants/${id}/history`),
  },

  calculation: {
    calculate: (data: CalculateRequest) =>
      request<Participant[]>('/calculation/calculate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    rules: () => request<RefundRule[]>('/calculation/rules'),

    createRule: (data: Omit<RefundRule, 'id' | 'createdAt'>) =>
      request<RefundRule>('/calculation/rules', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateRule: (id: string, data: Partial<RefundRule>) =>
      request<RefundRule>(`/calculation/rules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    channels: () =>
      request<
        {
          id: string
          channel: string
          feeRate: number
          fixedFee: number
        }[]
      >('/calculation/channels'),
  },

  batches: {
    list: (params?: { status?: string; page?: number; pageSize?: number }) => {
      const query = new URLSearchParams()
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            query.append(k, String(v))
          }
        })
      }
      return request<{ batches: RefundBatch[]; total: number }>(`/batches?${query.toString()}`)
    },

    get: (id: string) => request<RefundBatch>(`/batches/${id}`),

    create: (data: CreateBatchRequest) =>
      request<RefundBatch>('/batches', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    freeze: (id: string) =>
      request<RefundBatch>(`/batches/${id}/freeze`, { method: 'POST' }),

    unfreeze: (id: string) =>
      request<RefundBatch>(`/batches/${id}/unfreeze`, { method: 'POST' }),

    execute: (id: string) =>
      request<RefundBatch>(`/batches/${id}/execute`, { method: 'POST' }),
  },

  exports: {
    list: (params?: { page?: number; pageSize?: number }) => {
      const query = new URLSearchParams()
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            query.append(k, String(v))
          }
        })
      }
      return request<{ records: ExportRecord[]; total: number }>(`/exports?${query.toString()}`)
    },

    refundDetails: (data: { batchId?: string; filters?: any }) =>
      request<ExportRecord>('/exports/refund-details', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    allocationReport: (data: { batchId: string }) =>
      request<ExportRecord>('/exports/allocation-report', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    download: (id: string) => {
      window.open(`${API_BASE}/exports/${id}/download`, '_blank')
    },
  },

  auditLogs: {
    list: (params?: {
      entityType?: string
      entityId?: string
      page?: number
      pageSize?: number
    }) => {
      const query = new URLSearchParams()
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            query.append(k, String(v))
          }
        })
      }
      return request<{ logs: AuditLog[]; total: number }>(`/audit-logs?${query.toString()}`)
    },
  },
}
