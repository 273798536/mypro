import { create } from 'zustand'
import axios from 'axios'
import type {
  NormalRecord,
  FilterState,
  RecordStatus,
  OcclusionInfo,
  HistoryItem,
} from '@/types'

interface UpdateRecordPayload {
  status?: RecordStatus
  occlusion?: Partial<OcclusionInfo>
  [key: string]: any
}

interface AddSlicePayload {
  sliceIndex: number
  data: number[]
}

interface SubmitCorrectionPayload {
  status?: RecordStatus
  occlusion?: Partial<OcclusionInfo>
  details?: string
  [key: string]: any
}

interface RecordState {
  records: NormalRecord[]
  currentRecord: NormalRecord | null
  filter: FilterState
  loading: boolean
  error: string | null
  fetchRecords: () => Promise<void>
  fetchRecordById: (id: string) => Promise<void>
  updateRecord: (id: string, data: UpdateRecordPayload) => Promise<void>
  addSlice: (recordId: string, payload: AddSlicePayload) => Promise<void>
  submitCorrection: (id: string, payload: SubmitCorrectionPayload) => Promise<void>
  setFilter: (filter: Partial<FilterState>) => void
  setCurrentRecord: (record: NormalRecord | null) => void
  clearError: () => void
}

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

interface BackendNormalVector {
  id: string
  recordId: string
  position: { x: number; y: number; z: number }
  direction: { x: number; y: number; z: number }
  deviation: number
  isValid: boolean
  explanation: string
}

interface BackendScreenshot {
  id: string
  recordId: string
  order: number
  url: string
  timestamp: string
  annotation: string | null
  hasIssue?: boolean
}

interface BackendPointCloudSlice {
  id: string
  recordId: string
  sliceIndex: number
  data: number[]
  timestamp: string
}

interface BackendHistoryItem {
  id: string
  recordId: string
  action: string
  userId: string
  userName?: string
  version?: string
  timestamp: string
  details: string | null
  snapshot?: any
}

interface BackendNormalRecord {
  id: string
  timestamp: string
  deviceId: string
  deviceCoordinates: { x: number; y: number; z: number }
  operator: string
  status: RecordStatus
  pointCount: number
  normalDeviation: number
  normalData: BackendNormalVector[]
  occlusionReason: string | null
  occlusion: {
    detected: boolean
    reason: string | null
    severity: 'low' | 'medium' | 'high' | null
    affectedArea: { x: number; y: number; width: number; height: number } | null
    deviceCoordinateRelation: string | null
  }
  screenshots: BackendScreenshot[]
  pointCloudSlices: BackendPointCloudSlice[]
  history: BackendHistoryItem[]
  createdAt: string
  updatedAt: string
}

function transformBackendRecord(backend: BackendNormalRecord): NormalRecord {
  return {
    id: backend.id,
    timestamp: backend.timestamp,
    deviceId: backend.deviceId,
    deviceCoordinates: backend.deviceCoordinates,
    operator: backend.operator,
    status: backend.status,
    pointCount: backend.pointCount,
    normalDeviation: backend.normalDeviation,
    normalVectors: backend.normalData.map((v) => ({
      id: v.id,
      position: v.position,
      direction: v.direction,
      deviation: v.deviation,
      isValid: v.isValid,
      explanation: v.explanation,
    })),
    occlusion: backend.occlusion,
    screenshots: backend.screenshots.map((s) => ({
      id: s.id,
      order: s.order,
      url: s.url,
      timestamp: s.timestamp,
      annotation: s.annotation,
      hasIssue: s.hasIssue,
    })),
    slices: backend.pointCloudSlices.map((sl) => ({
      id: sl.id,
      sliceIndex: sl.sliceIndex,
      data: sl.data,
      timestamp: sl.timestamp,
    })),
    history: backend.history.map((h) => ({
      id: h.id,
      action: h.action,
      userId: h.userId,
      userName: h.userName,
      timestamp: h.timestamp,
      details: h.details,
      version: h.version,
    })),
    createdAt: backend.createdAt,
    updatedAt: backend.updatedAt,
  }
}

export const useRecordStore = create<RecordState>((set, get) => ({
  records: [],
  currentRecord: null,
  filter: {
    status: 'all',
    deviceId: '',
    severity: '',
    keyword: '',
    dateRange: null,
  },
  loading: false,
  error: null,

  fetchRecords: async () => {
    set({ loading: true, error: null })
    try {
      const { filter } = get()
      const params = new URLSearchParams()
      if (filter.status && filter.status !== 'all') {
        params.append('status', filter.status)
      }
      if (filter.deviceId) {
        params.append('deviceId', filter.deviceId)
      }
      if (filter.severity) {
        params.append('severity', filter.severity)
      }
      if (filter.keyword) {
        params.append('keyword', filter.keyword)
      }
      if (filter.dateRange) {
        params.append('startDate', filter.dateRange[0])
        params.append('endDate', filter.dateRange[1])
      }

      const queryString = params.toString()
      const url = queryString ? `/records?${queryString}` : '/records'
      const { data } = await api.get<BackendNormalRecord[]>(url)
      const transformed = data.map(transformBackendRecord)
      set({ records: transformed, loading: false })
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.message || '获取记录列表失败',
        loading: false,
      })
    }
  },

  fetchRecordById: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get<BackendNormalRecord>(`/records/${id}`)
      const transformed = transformBackendRecord(data)
      set({ currentRecord: transformed, loading: false })
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.message || '获取记录详情失败',
        loading: false,
      })
    }
  },

  updateRecord: async (id: string, data: UpdateRecordPayload) => {
    set({ loading: true, error: null })
    try {
      const { data: updated } = await api.put<BackendNormalRecord>(`/records/${id}`, data)
      const transformed = transformBackendRecord(updated)
      set((state) => ({
        records: state.records.map((r) => (r.id === id ? transformed : r)),
        currentRecord: state.currentRecord?.id === id ? transformed : state.currentRecord,
        loading: false,
      }))
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.message || '更新记录失败',
        loading: false,
      })
    }
  },

  addSlice: async (recordId: string, payload: AddSlicePayload) => {
    set({ loading: true, error: null })
    try {
      const { data: updated } = await api.post<BackendNormalRecord>(
        `/records/${recordId}/slices`,
        payload
      )
      const transformed = transformBackendRecord(updated)
      set((state) => ({
        records: state.records.map((r) => (r.id === recordId ? transformed : r)),
        currentRecord: state.currentRecord?.id === recordId ? transformed : state.currentRecord,
        loading: false,
      }))
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.message || '添加切片失败',
        loading: false,
      })
    }
  },

  submitCorrection: async (id: string, payload: SubmitCorrectionPayload) => {
    set({ loading: true, error: null })
    try {
      const { currentRecord } = get()
      const historyItem: Partial<HistoryItem> = {
        action: 'correction',
        details: payload.details || '提交校正',
        timestamp: new Date().toISOString(),
      }

      const updatePayload: UpdateRecordPayload = {
        ...payload,
        history: currentRecord
          ? [...currentRecord.history, historyItem as HistoryItem]
          : [historyItem as HistoryItem],
      }

      const { data: updated } = await api.put<BackendNormalRecord>(`/records/${id}`, updatePayload)
      const transformed = transformBackendRecord(updated)
      set((state) => ({
        records: state.records.map((r) => (r.id === id ? transformed : r)),
        currentRecord: state.currentRecord?.id === id ? transformed : state.currentRecord,
        loading: false,
      }))
    } catch (err: any) {
      set({
        error: err.response?.data?.message || err.message || '提交校正失败',
        loading: false,
      })
    }
  },

  setFilter: (filter: Partial<FilterState>) => {
    set((state) => ({ filter: { ...state.filter, ...filter } }))
  },

  setCurrentRecord: (record: NormalRecord | null) => {
    set({ currentRecord: record })
  },

  clearError: () => {
    set({ error: null })
  },
}))
