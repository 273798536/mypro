import { create } from 'zustand'

export interface DataPoint {
  x: number
  y: number
  unit?: string
}

export interface SegmentResult {
  slope: number
  intercept: number
  r2: number
  startX: number
  endX: number
  unit: string | null
  unitMissing: boolean
  dataPoints: DataPoint[]
  boundarySamples: DataPoint[]
}

export interface BoundaryImpact {
  breakpoint: number
  leftSegment: number
  rightSegment: number
  nearbyPoints: DataPoint[]
  influenceOnConclusion: string
}

export interface SensitivityEntry {
  parameter: string
  oldValue: unknown
  newValue: unknown
  affectedSegments: number[]
  description: string
}

export interface RegressionResult {
  segments: SegmentResult[]
  breakpoints: number[]
  totalR2: number
  unitWarnings: string[]
  formulaDisplay: string[]
  boundaryImpact: BoundaryImpact[]
  parameterSensitivity: SensitivityEntry[]
}

export interface RegressionParams {
  breakpoints?: number[]
  unit?: string
  minSegmentSize?: number
  sensitivityCompare?: {
    params: RegressionParams
    label: string
  }
}

export type MaterialType = 'error_record' | 'withdrawal' | 'verbal_note'

export interface Material {
  id: string
  session_id: string
  type: MaterialType
  content: Record<string, unknown>
  version: number
  is_active: number
  created_at: string
}

export interface MaterialImpact {
  materialId: string
  type: string
  affectedSegments: number[]
  description: string
}

export interface SessionInfo {
  id: string
  name: string
  status: string
  params: RegressionParams
  createdAt: string
  updatedAt: string
}

export interface HistoryEntry {
  id: string
  session_id: string
  action: string
  details: Record<string, unknown>
  created_at: string
}

interface RegressionState {
  sessions: SessionInfo[]
  currentSession: SessionInfo | null
  materials: Material[]
  result: RegressionResult | null
  materialImpact: MaterialImpact[]
  history: HistoryEntry[]
  data: DataPoint[]
  params: RegressionParams
  loading: boolean
  error: string | null

  fetchSessions: () => Promise<void>
  createSession: (name?: string) => Promise<void>
  selectSession: (id: string) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  updateParams: (params: RegressionParams) => Promise<void>
  setData: (data: DataPoint[]) => void
  addDataPoint: (point: DataPoint) => void
  removeDataPoint: (index: number) => void
  addMaterial: (type: MaterialType, content: Record<string, unknown>) => Promise<void>
  updateMaterial: (materialId: string, updates: { content?: Record<string, unknown>; isActive?: boolean }) => Promise<void>
  deleteMaterial: (materialId: string) => Promise<void>
  compute: (sensitivityCompare?: { params: RegressionParams; label: string }) => Promise<void>
  restoreState: () => Promise<void>
  clearError: () => void
}

const API_BASE = '/api/regression'
const LAST_SESSION_KEY = 'regression_last_session_id'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || '请求失败')
  return json.data as T
}

export const useRegressionStore = create<RegressionState>((set, get) => ({
  sessions: [],
  currentSession: null,
  materials: [],
  result: null,
  materialImpact: [],
  history: [],
  data: [],
  params: {},
  loading: false,
  error: null,

  fetchSessions: async () => {
    set({ loading: true, error: null })
    try {
      const sessions = await apiFetch<SessionInfo[]>('/sessions')
      set({ sessions, loading: false })

      const savedId = localStorage.getItem(LAST_SESSION_KEY)
      const { currentSession, selectSession } = get()
      if (savedId && !currentSession && sessions.some(s => s.id === savedId)) {
        selectSession(savedId)
      }
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  createSession: async (name?: string) => {
    set({ loading: true, error: null })
    try {
      const session = await apiFetch<SessionInfo>('/sessions', {
        method: 'POST',
        body: JSON.stringify({ name: name || '新建分段回归会话' }),
      })
      localStorage.setItem(LAST_SESSION_KEY, session.id)
      set(state => ({ sessions: [session, ...state.sessions], currentSession: session, materials: [], result: null, materialImpact: [], history: [], loading: false }))
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  selectSession: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const data = await apiFetch<{
        session: SessionInfo
        materials: Material[]
        result: RegressionResult | null
        recentHistory: HistoryEntry[]
      }>(`/sessions/${id}/state`)
      localStorage.setItem(LAST_SESSION_KEY, id)
      set({
        currentSession: data.session,
        materials: data.materials,
        result: data.result,
        history: data.recentHistory,
        params: data.session.params,
        loading: false,
      })
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  deleteSession: async (id: string) => {
    try {
      await apiFetch(`/sessions/${id}`, { method: 'DELETE' })
      set(state => ({
        sessions: state.sessions.filter(s => s.id !== id),
        currentSession: state.currentSession?.id === id ? null : state.currentSession,
        materials: state.currentSession?.id === id ? [] : state.materials,
        result: state.currentSession?.id === id ? null : state.result,
      }))
    } catch (e: unknown) {
      set({ error: (e as Error).message })
    }
  },

  updateParams: async (params: RegressionParams) => {
    const { currentSession } = get()
    if (!currentSession) return
    try {
      const updated = await apiFetch<SessionInfo>(`/sessions/${currentSession.id}`, {
        method: 'PUT',
        body: JSON.stringify({ params }),
      })
      set({ currentSession: updated, params })
    } catch (e: unknown) {
      set({ error: (e as Error).message })
    }
  },

  setData: (data: DataPoint[]) => set({ data }),
  addDataPoint: (point: DataPoint) => set(state => ({ data: [...state.data, point] })),
  removeDataPoint: (index: number) => set(state => ({ data: state.data.filter((_, i) => i !== index) })),

  addMaterial: async (type: MaterialType, content: Record<string, unknown>) => {
    const { currentSession } = get()
    if (!currentSession) return
    try {
      const material = await apiFetch<Material>(`/sessions/${currentSession.id}/materials`, {
        method: 'POST',
        body: JSON.stringify({ type, content }),
      })
      set(state => ({ materials: [...state.materials, material] }))
    } catch (e: unknown) {
      set({ error: (e as Error).message })
    }
  },

  updateMaterial: async (materialId: string, updates: { content?: Record<string, unknown>; isActive?: boolean }) => {
    const { currentSession } = get()
    if (!currentSession) return
    try {
      const updated = await apiFetch<Material>(`/sessions/${currentSession.id}/materials/${materialId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      })
      set(state => ({
        materials: state.materials.map(m => m.id === materialId ? updated : m),
      }))
    } catch (e: unknown) {
      set({ error: (e as Error).message })
    }
  },

  deleteMaterial: async (materialId: string) => {
    const { currentSession } = get()
    if (!currentSession) return
    try {
      await apiFetch(`/sessions/${currentSession.id}/materials/${materialId}`, { method: 'DELETE' })
      set(state => ({ materials: state.materials.filter(m => m.id !== materialId) }))
    } catch (e: unknown) {
      set({ error: (e as Error).message })
    }
  },

  compute: async (sensitivityCompare?: { params: RegressionParams; label: string }) => {
    const { currentSession, data, params } = get()
    if (!currentSession) return
    set({ loading: true, error: null })
    try {
      const response = await apiFetch<{
        result: RegressionResult
        materialImpact: MaterialImpact[]
        sessionId: string
      }>(`/sessions/${currentSession.id}/compute`, {
        method: 'POST',
        body: JSON.stringify({ data, params, sensitivityCompare }),
      })
      set({
        result: response.result,
        materialImpact: response.materialImpact,
        loading: false,
      })
      const stateData = await apiFetch<{
        session: SessionInfo
        materials: Material[]
        result: RegressionResult | null
        recentHistory: HistoryEntry[]
      }>(`/sessions/${currentSession.id}/state`)
      set({ history: stateData.recentHistory, currentSession: stateData.session })
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  restoreState: async () => {
    const { currentSession } = get()
    if (!currentSession) return
    set({ loading: true, error: null })
    try {
      const data = await apiFetch<{
        session: SessionInfo
        materials: Material[]
        result: RegressionResult | null
        recentHistory: HistoryEntry[]
      }>(`/sessions/${currentSession.id}/state`)
      set({
        currentSession: data.session,
        materials: data.materials,
        result: data.result,
        history: data.recentHistory,
        params: data.session.params,
        loading: false,
      })
    } catch (e: unknown) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  clearError: () => set({ error: null }),
}))
