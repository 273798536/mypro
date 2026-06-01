import { create } from 'zustand'

export interface Batch {
  id: string
  batchNo: string
  modelNo: string
  windTunnelNo: string
  testDate: string
  status: 'pending_review' | 'anomaly' | 'completed'
  anomalyCount?: number
  materials?: Material[]
  createdAt: string
  updatedAt: string
}

export interface Material {
  id: string
  batchId: string
  type: 'angle_of_attack' | 'force_sensor' | 'curve_report'
  name: string
  data: Record<string, unknown>
  anomalyFlag: boolean
  anomalyType?: string
  createdAt: string
}

export interface LiftDragResult {
  batchId: string
  points: { alpha: number; cl: number; cd: number; cl_cd: number }[]
  zeroCorrectionApplied: boolean
  zeroCorrectionValue: number
  calculationNote: string
  calculatedAt: string
}

interface BatchFilters {
  modelNo?: string
  status?: string
  startDate?: string
  endDate?: string
}

function mapBatch(raw: Record<string, unknown>): Batch {
  return {
    id: raw.id as string,
    batchNo: raw.batch_no as string,
    modelNo: raw.model_no as string,
    windTunnelNo: raw.wind_tunnel_no as string,
    testDate: raw.test_date as string,
    status: raw.status as Batch['status'],
    anomalyCount: (raw.anomaly_count ?? raw.anomalyCount) as number | undefined,
    materials: raw.materials ? (raw.materials as Record<string, unknown>[]).map(mapMaterial) : undefined,
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string,
  }
}

function mapMaterial(raw: Record<string, unknown>): Material {
  const dataStr = raw.data as string
  let parsedData: Record<string, unknown> = {}
  try {
    parsedData = typeof dataStr === 'string' ? JSON.parse(dataStr) : (dataStr ?? {})
  } catch {
    parsedData = { raw: dataStr }
  }
  return {
    id: raw.id as string,
    batchId: raw.batch_id as string,
    type: raw.type as Material['type'],
    name: raw.name as string,
    data: parsedData,
    anomalyFlag: !!raw.anomaly_flag,
    anomalyType: raw.anomaly_type as string | undefined,
    createdAt: raw.created_at as string,
  }
}

function mapCalculation(raw: Record<string, unknown>): LiftDragResult {
  const pointsStr = raw.points as string
  let points: { alpha: number; cl: number; cd: number; cl_cd: number }[] = []
  try {
    const parsed = typeof pointsStr === 'string' ? JSON.parse(pointsStr) : pointsStr
    if (Array.isArray(parsed)) {
      points = parsed.map((p: Record<string, number>) => ({
        alpha: p.alpha,
        cl: p.cl ?? p.Cl ?? 0,
        cd: p.cd ?? p.Cd ?? 0,
        cl_cd: p.cl_cd ?? (p.cd ? p.cl / p.cd : 0),
      }))
    }
  } catch { /* empty */ }
  return {
    batchId: raw.batch_id as string,
    points,
    zeroCorrectionApplied: !!raw.zero_correction_applied,
    zeroCorrectionValue: (raw.zero_correction_value ?? 0) as number,
    calculationNote: (raw.calculation_note ?? '') as string,
    calculatedAt: raw.calculated_at as string,
  }
}

interface BatchState {
  batches: Batch[]
  currentBatch: Batch | null
  materials: Material[]
  calculation: LiftDragResult | null
  loading: boolean
  error: string | null
  fetchBatches: (filters?: BatchFilters) => Promise<void>
  createBatch: (data: { modelNo: string; windTunnelNo: string; testDate: string }) => Promise<Batch>
  fetchBatchDetail: (id: string) => Promise<void>
  advanceStatus: (id: string, toStatus: string) => Promise<void>
  fetchMaterials: (batchId: string) => Promise<void>
  addMaterial: (batchId: string, data: { type: string; name: string; data: Record<string, unknown> }) => Promise<void>
  removeMaterial: (id: string) => Promise<void>
  calculate: (batchId: string) => Promise<void>
  fetchCalculation: (batchId: string) => Promise<void>
}

export const useBatchStore = create<BatchState>((set) => ({
  batches: [],
  currentBatch: null,
  materials: [],
  calculation: null,
  loading: false,
  error: null,

  fetchBatches: async (filters) => {
    set({ loading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters?.modelNo) params.set('modelNo', filters.modelNo)
      if (filters?.status) params.set('status', filters.status)
      if (filters?.startDate) params.set('dateFrom', filters.startDate)
      if (filters?.endDate) params.set('dateTo', filters.endDate)
      const res = await fetch(`/api/batches?${params.toString()}`)
      const json = await res.json()
      const rawList = json.data ?? json
      const batches = Array.isArray(rawList) ? rawList.map((r: Record<string, unknown>) => mapBatch(r)) : []
      set({ batches, loading: false })
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  createBatch: async (data) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_no: data.modelNo,
          wind_tunnel_no: data.windTunnelNo,
          test_date: data.testDate,
        }),
      })
      const json = await res.json()
      const batch = mapBatch(json.data ?? json)
      set((s) => ({ batches: [batch, ...s.batches], loading: false }))
      return batch
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false })
      throw e
    }
  },

  fetchBatchDetail: async (id) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`/api/batches/${id}`)
      const json = await res.json()
      const raw = json.data ?? json
      const batch = mapBatch(raw)
      const materials = raw.materials ? (raw.materials as Record<string, unknown>[]).map(mapMaterial) : []
      set({ currentBatch: batch, materials, loading: false })
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  advanceStatus: async (id, toStatus) => {
    set({ loading: true, error: null })
    try {
      await fetch(`/api/batches/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStatus }),
      })
      set((s) => ({
        currentBatch: s.currentBatch
          ? { ...s.currentBatch, status: toStatus as Batch['status'] }
          : null,
        loading: false,
      }))
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  fetchMaterials: async (batchId) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`/api/batches/${batchId}/materials`)
      const json = await res.json()
      const rawList = json.data ?? json
      const materials = Array.isArray(rawList) ? rawList.map((r: Record<string, unknown>) => mapMaterial(r)) : []
      set({ materials, loading: false })
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  addMaterial: async (batchId, data) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`/api/batches/${batchId}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: data.type, name: data.name, data: data.data }),
      })
      const json = await res.json()
      const material = mapMaterial(json.data ?? json)
      set((s) => ({ materials: [...s.materials, material], loading: false }))
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  removeMaterial: async (id) => {
    set({ loading: true, error: null })
    try {
      await fetch(`/api/materials/${id}`, { method: 'DELETE' })
      set((s) => ({
        materials: s.materials.filter((m) => m.id !== id),
        loading: false,
      }))
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  calculate: async (batchId) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`/api/batches/${batchId}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json()
      const calc = mapCalculation(json.data ?? json)
      set({ calculation: calc, loading: false })
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  fetchCalculation: async (batchId) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`/api/batches/${batchId}/calculate`)
      const json = await res.json()
      if (json.data && (json.data as Record<string, unknown>).points) {
        const calc = mapCalculation(json.data)
        set({ calculation: calc, loading: false })
      } else {
        set({ calculation: null, loading: false })
      }
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false })
    }
  },
}))
