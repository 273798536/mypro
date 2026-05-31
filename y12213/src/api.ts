import type { Warning, Supplier, SupplierDetail, Contract, History } from './types'

const BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, options)
  const json = await res.json()
  if (!json.success) throw new Error(json.error || '请求失败')
  return json.data
}

export const api = {
  warnings: {
    list: (params?: { supplierId?: string; status?: string; level?: string }) => {
      const qs = new URLSearchParams()
      if (params?.supplierId) qs.set('supplierId', params.supplierId)
      if (params?.status) qs.set('status', params.status)
      if (params?.level) qs.set('level', params.level)
      const query = qs.toString()
      return request<Warning[]>(`/warnings${query ? `?${query}` : ''}`)
    },
    confirm: (id: string, confirmedBy: string) =>
      request<Warning>(`/warnings/${id}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmedBy }),
      }),
    updateRemark: (id: string, remark: string, modifiedBy: string) =>
      request<Warning>(`/warnings/${id}/remark`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remark, modifiedBy }),
      }),
    exportUrl: (params?: { supplierId?: string; status?: string; level?: string }) => {
      const qs = new URLSearchParams()
      if (params?.supplierId) qs.set('supplierId', params.supplierId)
      if (params?.status) qs.set('status', params.status)
      if (params?.level) qs.set('level', params.level)
      const query = qs.toString()
      return `${BASE}/warnings/export${query ? `?${query}` : ''}`
    },
  },

  suppliers: {
    list: (keyword?: string) => {
      const qs = new URLSearchParams()
      if (keyword) qs.set('keyword', keyword)
      const query = qs.toString()
      return request<Supplier[]>(`/suppliers${query ? `?${query}` : ''}`)
    },
    get: (id: string) => request<SupplierDetail>(`/suppliers/${id}`),
  },

  contracts: {
    list: (supplierId?: string) => {
      const qs = new URLSearchParams()
      if (supplierId) qs.set('supplierId', supplierId)
      const query = qs.toString()
      return request<Contract[]>(`/contracts${query ? `?${query}` : ''}`)
    },
    get: (id: string) => request<Contract>(`/contracts/${id}`),
    extend: (id: string, extendDays: number, reason: string, operator: string) =>
      request<Contract>(`/contracts/${id}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extendDays, reason, operator }),
      }),
    updateQuota: (id: string, newAmount: number, reason: string, operator: string) =>
      request<Contract>(`/contracts/${id}/quota`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newAmount, reason, operator }),
      }),
  },

  histories: {
    list: (params?: { targetType?: string; targetId?: string; actionType?: string }) => {
      const qs = new URLSearchParams()
      if (params?.targetType) qs.set('targetType', params.targetType)
      if (params?.targetId) qs.set('targetId', params.targetId)
      if (params?.actionType) qs.set('actionType', params.actionType)
      const query = qs.toString()
      return request<History[]>(`/histories${query ? `?${query}` : ''}`)
    },
  },
}
