import { create } from 'zustand'

export interface CultureRecord {
  id: number
  animal_id: string
  experiment_group: string
  sampling_location: string | null
  reagent_batch: string
  expected_batch: string
  culture_date: string
  status: 'normal' | 'pending_review' | 'anomaly'
  created_at: string
  updated_at: string
}

export interface Anomaly {
  id: number
  record_id: number
  type: 'batch_mismatch' | 'boundary_unclear' | 'data_missing'
  description: string
  suggestion: string
  suggestion_detail: string
  status: 'pending' | 'resolved' | 'ignored' | 'escalated'
  created_at: string
  resolved_at: string | null
  animal_id?: string
  experiment_group?: string
}

export interface GroupStatistics {
  group_name: string
  total: number
  normal: number
  anomaly: number
  pending_review: number
  anomaly_rate: number
}

export interface TrendData {
  date: string
  total: number
  anomaly_count: number
  anomaly_rate: number
}

export interface TrajectoryPoint {
  id: number
  session_id: number
  x: number
  y: number
  z: number
  timestamp: number
  speed: number
  region: string
}

export interface TrajectoryAnnotation {
  id: number
  session_id: number
  point_index: number
  label: string
  detail: string
  type: string
}

export interface TrajectorySession {
  id: number
  animal_id: string
  session_id: string
  experiment_group: string
  start_time: string
  end_time: string
  point_count?: number
  annotation_count?: number
  points?: TrajectoryPoint[]
  annotations?: TrajectoryAnnotation[]
}

export interface ReportPreview {
  records: { total: number; items: CultureRecord[] }
  anomalies: {
    total: number
    items: (Anomaly & { explanation: string })[]
    summary: { type: string; count: number; suggestion: string }[]
  }
  statistics: GroupStatistics[]
  generatedAt: string
}

export type AnomalyTab = 'batch_mismatch' | 'boundary_unclear' | 'data_missing' | 'all'

interface AppState {
  records: CultureRecord[]
  anomalies: Anomaly[]
  anomalySummary: {
    typeCounts: Record<string, { count: number; suggestion: string; suggestionDetail: string }>
    statusCounts: Record<string, number>
    total: number
  } | null
  statistics: GroupStatistics[]
  trends: TrendData[]
  locationStats: GroupStatistics[]
  trajectoryData: TrajectorySession[] | null
  sessions: TrajectorySession[]
  reportPreview: ReportPreview | null
  loading: boolean
  selectedRecord: CultureRecord | null
  selectedAnomalyTab: AnomalyTab
  fetchRecords: (params?: Record<string, string>) => Promise<void>
  fetchAnomalies: (params?: Record<string, string>) => Promise<void>
  fetchAnomalySummary: () => Promise<void>
  fetchStatistics: () => Promise<void>
  fetchTrends: (params?: Record<string, string>) => Promise<void>
  fetchLocationStats: () => Promise<void>
  fetchTrajectory: (animalId: string) => Promise<void>
  fetchSessions: () => Promise<void>
  fetchReportPreview: () => Promise<void>
  createRecord: (data: Partial<CultureRecord>) => Promise<void>
  updateRecord: (id: number, data: Partial<CultureRecord>) => Promise<void>
  updateAnomaly: (id: number, data: { status: string }) => Promise<void>
  validateRecords: (ids: number[]) => Promise<void>
  setSelectedRecord: (record: CultureRecord | null) => void
  setSelectedAnomalyTab: (tab: AnomalyTab) => void
}

export const useAppStore = create<AppState>((set) => ({
  records: [],
  anomalies: [],
  anomalySummary: null,
  statistics: [],
  trends: [],
  locationStats: [],
  trajectoryData: null,
  sessions: [],
  reportPreview: null,
  loading: false,
  selectedRecord: null,
  selectedAnomalyTab: 'all',

  fetchRecords: async (params) => {
    set({ loading: true })
    try {
      const query = params ? '?' + new URLSearchParams(params).toString() : ''
      const res = await fetch(`/api/records${query}`)
      const json = await res.json()
      if (json.success) set({ records: json.data })
    } finally {
      set({ loading: false })
    }
  },

  fetchAnomalies: async (params) => {
    set({ loading: true })
    try {
      const query = params ? '?' + new URLSearchParams(params).toString() : ''
      const res = await fetch(`/api/anomalies${query}`)
      const json = await res.json()
      if (json.success) set({ anomalies: json.data })
    } finally {
      set({ loading: false })
    }
  },

  fetchAnomalySummary: async () => {
    try {
      const res = await fetch('/api/anomalies/summary')
      const json = await res.json()
      if (json.success) set({ anomalySummary: json.data })
    } catch {}
  },

  fetchStatistics: async () => {
    try {
      const res = await fetch('/api/statistics/groups')
      const json = await res.json()
      if (json.success) set({ statistics: json.data })
    } catch {}
  },

  fetchTrends: async (params) => {
    try {
      const query = params ? '?' + new URLSearchParams(params).toString() : ''
      const res = await fetch(`/api/statistics/trends${query}`)
      const json = await res.json()
      if (json.success) set({ trends: json.data })
    } catch {}
  },

  fetchLocationStats: async () => {
    try {
      const res = await fetch('/api/statistics/by-location')
      const json = await res.json()
      if (json.success) set({ locationStats: json.data })
    } catch {}
  },

  fetchTrajectory: async (animalId) => {
    set({ loading: true })
    try {
      const res = await fetch(`/api/trajectory/${animalId}`)
      const json = await res.json()
      if (json.success) set({ trajectoryData: json.data })
    } finally {
      set({ loading: false })
    }
  },

  fetchSessions: async () => {
    try {
      const res = await fetch('/api/trajectory')
      const json = await res.json()
      if (json.success) set({ sessions: json.data })
    } catch {}
  },

  fetchReportPreview: async () => {
    set({ loading: true })
    try {
      const res = await fetch('/api/export/preview')
      const json = await res.json()
      if (json.success) set({ reportPreview: json.data })
    } finally {
      set({ loading: false })
    }
  },

  createRecord: async (data) => {
    set({ loading: true })
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.success) {
        set((state) => ({ records: [json.data, ...state.records] }))
      }
    } finally {
      set({ loading: false })
    }
  },

  updateRecord: async (id, data) => {
    set({ loading: true })
    try {
      const res = await fetch(`/api/records/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.success) {
        set((state) => ({
          records: state.records.map((r) => (r.id === id ? json.data : r)),
        }))
      }
    } finally {
      set({ loading: false })
    }
  },

  updateAnomaly: async (id, data) => {
    const res = await fetch(`/api/anomalies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.success) {
      set((state) => ({
        anomalies: state.anomalies.map((a) => (a.id === id ? json.data : a)),
      }))
    }
  },

  validateRecords: async (ids) => {
    set({ loading: true })
    try {
      await fetch('/api/records/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
    } finally {
      set({ loading: false })
    }
  },

  setSelectedRecord: (record) => set({ selectedRecord: record }),
  setSelectedAnomalyTab: (tab) => set({ selectedAnomalyTab: tab }),
}))
