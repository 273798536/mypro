import type {
  DashboardData,
  MemberAccount,
  PetProfile,
  Package,
  Transaction,
  DeductionDetail,
  ExceptionItem,
  RefundCalculation,
} from '@/types'

const BASE = '/api'

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, options)
  if (!res.ok) throw new Error(`API Error: ${res.status}`)
  return res.json()
}

interface PaginatedData<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

function buildQuery(filters?: Record<string, string>): string {
  if (!filters || Object.keys(filters).length === 0) return ''
  const params = new URLSearchParams(filters)
  return `?${params.toString()}`
}

export const api = {
  dashboard: {
    getStats: (filters?: Record<string, string>) => {
      return fetchJSON<{ success: boolean; data: DashboardData }>(`/dashboard${buildQuery(filters)}`)
    },
  },
  members: {
    list: async (filters?: Record<string, string>): Promise<MemberAccount[]> => {
      const res = await fetchJSON<{ success: boolean; data: PaginatedData<MemberAccount> }>(`/members${buildQuery(filters)}`)
      return res.data.list
    },
    get: (id: string) => fetchJSON<{ success: boolean; data: MemberAccount & { pets: PetProfile[]; packages: Package[] } }>(`/members/${id}`),
    create: (data: Partial<MemberAccount>) => fetchJSON('/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    update: (id: string, data: Partial<MemberAccount>) => fetchJSON(`/members/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
  pets: {
    list: async (filters?: Record<string, string>): Promise<PetProfile[]> => {
      const res = await fetchJSON<{ success: boolean; data: PaginatedData<PetProfile> }>(`/pets${buildQuery(filters)}`)
      return res.data.list
    },
    create: (data: Partial<PetProfile>) => fetchJSON('/pets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    ownershipChange: (petId: string, data: { newOwnerId: string; reason: string }) => fetchJSON(`/pets/${petId}/ownership-change`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    approveOwnership: (id: string, data: { status: string; confirmedBy: string }) => fetchJSON(`/ownership-changes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
  transactions: {
    list: async (filters?: Record<string, string>): Promise<Transaction[]> => {
      const res = await fetchJSON<{ success: boolean; data: PaginatedData<Transaction> }>(`/transactions${buildQuery(filters)}`)
      return res.data.list
    },
    create: (data: Partial<Transaction>) => fetchJSON('/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    backfill: (data: Partial<Transaction> & { backfill_note: string }) => fetchJSON('/transactions/backfill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
  deductionDetails: {
    list: async (filters?: Record<string, string>): Promise<DeductionDetail[]> => {
      const res = await fetchJSON<{ success: boolean; data: PaginatedData<DeductionDetail> }>(`/deduction-details${buildQuery(filters)}`)
      return res.data.list
    },
    updateStatus: (id: string, data: { status: string; overrideBy: string; reason: string }) => fetchJSON(`/deduction-details/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
  packages: {
    list: async (filters?: Record<string, string>): Promise<Package[]> => {
      const res = await fetchJSON<{ success: boolean; data: PaginatedData<Package> }>(`/packages${buildQuery(filters)}`)
      return res.data.list
    },
    stats: (filters?: Record<string, string>) => {
      return fetchJSON<{ success: boolean; data: any }>(`/packages/stats${buildQuery(filters)}`)
    },
  },
  exceptions: {
    list: async (filters?: Record<string, string>): Promise<ExceptionItem[]> => {
      const res = await fetchJSON<{ success: boolean; data: PaginatedData<ExceptionItem> }>(`/exceptions${buildQuery(filters)}`)
      return res.data.list
    },
    handle: (id: string, data: { status: string; resolvedBy: string; resolution?: string }) => fetchJSON(`/exceptions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
  refund: {
    calculate: (packageId: string) => fetchJSON<{ success: boolean; data: any }>('/refund/calculate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packageId }) }),
  },
  export: {
    download: (type: string, format: string, filters?: Record<string, string>) => {
      return fetch(`${BASE}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, format, filters }),
      }).then(res => res.blob())
    },
  },
}
