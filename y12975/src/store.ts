import { create } from 'zustand'
import * as api from '@/api'

interface DriftState {
  list: api.DriftRecord[]
  detail: api.DriftDetail | null
  filters: { status: string; confidence: string; sourceType: string; q: string }
  loading: boolean
  error: string | null
  fetchList: () => Promise<void>
  fetchDetail: (id: string) => Promise<void>
  setFilters: (f: Partial<{ status: string; confidence: string; sourceType: string; q: string }>) => void
  reset: () => void
}

export const useDriftStore = create<DriftState>((set, get) => ({
  list: [],
  detail: null,
  filters: { status: '', confidence: '', sourceType: '', q: '' },
  loading: false,
  error: null,
  fetchList: async () => {
    set({ loading: true, error: null })
    const { filters } = get()
    const params: Record<string, string> = {}
    if (filters.status) params.status = filters.status
    if (filters.confidence) params.confidence = filters.confidence
    if (filters.sourceType) params.sourceType = filters.sourceType
    if (filters.q) params.q = filters.q
    const res = await api.getDriftList(params)
    if (res.ok && res.data) set({ list: res.data, loading: false })
    else set({ error: res.error || 'Failed to fetch', loading: false })
  },
  fetchDetail: async (id: string) => {
    set({ loading: true, error: null, detail: null })
    const res = (await api.getDriftDetail(id)) as {
      ok: boolean
      data?: api.DriftDetail
      error?: string
    }
    if (res.ok && res.data) set({ detail: res.data, loading: false })
    else set({ error: res.error || 'Failed to fetch', loading: false })
  },
  setFilters: (f) => set({ filters: { ...get().filters, ...f } }),
  reset: () =>
    set({
      list: [],
      detail: null,
      filters: { status: '', confidence: '', sourceType: '', q: '' },
      loading: false,
      error: null,
    }),
}))

interface DashState {
  stats: api.DashboardStats | null
  loading: boolean
  error: string | null
  fetchStats: () => Promise<void>
}

export const useDashStore = create<DashState>((set) => ({
  stats: null,
  loading: false,
  error: null,
  fetchStats: async () => {
    set({ loading: true, error: null })
    const res = await api.getDashboardStats()
    if (res.ok && res.data) set({ stats: res.data, loading: false })
    else set({ error: res.error || 'Failed to fetch', loading: false })
  },
}))
