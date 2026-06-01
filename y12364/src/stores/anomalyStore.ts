import { create } from 'zustand'

export interface Anomaly {
  id: string
  batchId: string
  materialId: string
  type: 'zero_drift' | 'angle_exceed' | 'speed_missing'
  triggerSource: string
  stuckStep: string
  nextAction: string
  resolution?: string
  zeroCorrectionSpec?: string
  status: 'open' | 'in_progress' | 'resolved'
  createdAt: string
  resolvedAt?: string
  batchNo?: string
  modelNo?: string
}

interface AnomalyFilters {
  type?: string
  status?: string
  batchId?: string
  modelNo?: string
}

function mapAnomaly(raw: Record<string, unknown>): Anomaly {
  return {
    id: raw.id as string,
    batchId: raw.batch_id as string,
    materialId: raw.material_id as string,
    type: raw.type as Anomaly['type'],
    triggerSource: raw.trigger_source as string,
    stuckStep: raw.stuck_step as string,
    nextAction: raw.next_action as string,
    resolution: raw.resolution as string | undefined,
    zeroCorrectionSpec: raw.zero_correction_spec as string | undefined,
    status: raw.status as Anomaly['status'],
    createdAt: raw.created_at as string,
    resolvedAt: raw.resolved_at as string | undefined,
    batchNo: raw.batch_no as string | undefined,
    modelNo: raw.model_no as string | undefined,
  }
}

interface AnomalyState {
  anomalies: Anomaly[]
  currentAnomaly: Anomaly | null
  loading: boolean
  error: string | null
  fetchAnomalies: (filters?: AnomalyFilters) => Promise<void>
  updateAnomaly: (id: string, data: Partial<Pick<Anomaly, 'resolution' | 'zeroCorrectionSpec' | 'status'>>) => Promise<void>
  resolveAnomaly: (id: string) => Promise<void>
  setCurrentAnomaly: (anomaly: Anomaly | null) => void
}

export const useAnomalyStore = create<AnomalyState>((set) => ({
  anomalies: [],
  currentAnomaly: null,
  loading: false,
  error: null,

  fetchAnomalies: async (filters) => {
    set({ loading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters?.type) params.set('type', filters.type)
      if (filters?.status) params.set('status', filters.status)
      if (filters?.batchId) params.set('batchId', filters.batchId)
      if (filters?.modelNo) params.set('modelNo', filters.modelNo)
      const res = await fetch(`/api/anomalies?${params.toString()}`)
      const json = await res.json()
      const rawList = json.data ?? json
      const anomalies = Array.isArray(rawList) ? rawList.map((r: Record<string, unknown>) => mapAnomaly(r)) : []
      set({ anomalies, loading: false })
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  updateAnomaly: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const body: Record<string, unknown> = {}
      if (data.resolution !== undefined) body.resolution = data.resolution
      if (data.zeroCorrectionSpec !== undefined) body.zero_correction_spec = data.zeroCorrectionSpec
      if (data.status !== undefined) body.status = data.status

      await fetch(`/api/anomalies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      set((s) => ({
        anomalies: s.anomalies.map((a) => (a.id === id ? { ...a, ...data } : a)),
        currentAnomaly: s.currentAnomaly?.id === id
          ? { ...s.currentAnomaly, ...data }
          : s.currentAnomaly,
        loading: false,
      }))
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  resolveAnomaly: async (id) => {
    set({ loading: true, error: null })
    try {
      await fetch(`/api/anomalies/${id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
      set((s) => ({
        anomalies: s.anomalies.map((a) =>
          a.id === id ? { ...a, status: 'resolved' as const, resolvedAt: new Date().toISOString() } : a
        ),
        currentAnomaly: s.currentAnomaly?.id === id
          ? { ...s.currentAnomaly, status: 'resolved' as const, resolvedAt: new Date().toISOString() }
          : s.currentAnomaly,
        loading: false,
      }))
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  setCurrentAnomaly: (anomaly) => set({ currentAnomaly: anomaly }),
}))
