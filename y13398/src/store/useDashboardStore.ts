import { create } from 'zustand'
import type { DashboardRecord, DashboardSummary, VersionInfo, VersionCompareResult, ChangeType, RecordStatus } from '../../shared/types'

interface DashboardStore {
  summary: DashboardSummary | null
  records: DashboardRecord[]
  recordsTotal: number
  versions: VersionInfo[]
  compareResult: VersionCompareResult | null
  filters: { type: ChangeType | ''; status: RecordStatus | ''; source: string }
  selectedFromVersion: string
  selectedToVersion: string
  loading: Record<string, boolean>
  error: Record<string, string | null>

  fetchSummary: () => Promise<void>
  fetchRecords: () => Promise<void>
  fetchVersions: () => Promise<void>
  fetchCompare: (from: string, to: string) => Promise<void>
  updateRecordStatus: (id: string, status: RecordStatus) => Promise<void>
  setFilter: (key: string, value: string) => void
  setVersions: (from: string, to: string) => void
  exportRecords: () => Promise<void>
}

function setLoading(state: DashboardStore, key: string, value: boolean) {
  return { ...state.loading, [key]: value }
}

function setError(state: DashboardStore, key: string, value: string | null) {
  return { ...state.error, [key]: value }
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  summary: null,
  records: [],
  recordsTotal: 0,
  versions: [],
  compareResult: null,
  filters: { type: '', status: '', source: '' },
  selectedFromVersion: 'v1',
  selectedToVersion: 'v2',
  loading: {},
  error: {},

  fetchSummary: async () => {
    set(s => ({ loading: setLoading(s, 'summary', true), error: setError(s, 'summary', null) }))
    try {
      const res = await fetch('/api/dashboard/summary')
      const data = await res.json()
      set(s => ({ summary: data, loading: setLoading(s, 'summary', false) }))
    } catch (e) {
      set(s => ({ loading: setLoading(s, 'summary', false), error: setError(s, 'summary', '获取看板数据失败') }))
    }
  },

  fetchRecords: async () => {
    set(s => ({ loading: setLoading(s, 'records', true), error: setError(s, 'records', null) }))
    try {
      const { filters } = get()
      const params = new URLSearchParams()
      if (filters.type) params.set('type', filters.type)
      if (filters.status) params.set('status', filters.status)
      if (filters.source) params.set('source', filters.source)
      const res = await fetch(`/api/records?${params.toString()}`)
      const data = await res.json()
      set(s => ({ records: data.records, recordsTotal: data.total, loading: setLoading(s, 'records', false) }))
    } catch (e) {
      set(s => ({ loading: setLoading(s, 'records', false), error: setError(s, 'records', '获取记录失败') }))
    }
  },

  fetchVersions: async () => {
    set(s => ({ loading: setLoading(s, 'versions', true), error: setError(s, 'versions', null) }))
    try {
      const res = await fetch('/api/versions')
      const data = await res.json()
      set(s => ({ versions: data, loading: setLoading(s, 'versions', false) }))
    } catch (e) {
      set(s => ({ loading: setLoading(s, 'versions', false), error: setError(s, 'versions', '获取版本失败') }))
    }
  },

  fetchCompare: async (from: string, to: string) => {
    set(s => ({ loading: setLoading(s, 'compare', true), error: setError(s, 'compare', null) }))
    try {
      const res = await fetch(`/api/versions/compare?from=${from}&to=${to}`)
      const data = await res.json()
      set(s => ({ compareResult: data, loading: setLoading(s, 'compare', false) }))
    } catch (e) {
      set(s => ({ loading: setLoading(s, 'compare', false), error: setError(s, 'compare', '获取对比数据失败') }))
    }
  },

  updateRecordStatus: async (id: string, status: RecordStatus) => {
    try {
      await fetch(`/api/records/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const { fetchRecords, fetchSummary } = get()
      await Promise.all([fetchRecords(), fetchSummary()])
    } catch (e) {
      console.error('更新状态失败', e)
    }
  },

  setFilter: (key: string, value: string) => {
    set(s => ({ filters: { ...s.filters, [key]: value } }))
  },

  setVersions: (from: string, to: string) => {
    set({ selectedFromVersion: from, selectedToVersion: to })
  },

  exportRecords: async () => {
    try {
      const { filters } = get()
      const params = new URLSearchParams()
      if (filters.type) params.set('type', filters.type)
      if (filters.status) params.set('status', filters.status)
      if (filters.source) params.set('source', filters.source)
      const res = await fetch(`/api/records/export?${params.toString()}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'dashboard-export.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('导出失败', e)
    }
  },
}))
