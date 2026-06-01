import { create } from "zustand"
import type {
  CalculateRequest,
  CalculationRecord,
  RecordFilter,
  PaginatedResult,
  RecordStatus,
} from "@shared/types"

interface PumpStore {
  currentRequest: CalculateRequest
  currentRecord: CalculationRecord | null
  records: PaginatedResult<CalculationRecord> | null
  loading: boolean
  error: string | null
  compareIds: string[]
  compareRecords: CalculationRecord[] | null

  setCurrentRequest: (req: Partial<CalculateRequest>) => void
  resetCurrentRequest: () => void
  submitCalculation: () => Promise<void>
  fetchRecords: (filter?: RecordFilter) => Promise<void>
  fetchRecordById: (id: string) => Promise<void>
  advanceStatus: (id: string, status: RecordStatus, operator: string, comment?: string) => Promise<void>
  deleteRecord: (id: string) => Promise<void>
  toggleCompareId: (id: string) => void
  clearCompareIds: () => void
  fetchComparison: (name: string) => Promise<void>
  exportRecord: (id: string, format: "json" | "csv") => Promise<void>
  exportBatch: (ids: string[], format: "json" | "csv") => Promise<void>
}

const defaultRequest: CalculateRequest = {
  ratedFlow: 100,
  ratedFlowUnit: "m3/h",
  ratedHead: 30,
  ratedHeadUnit: "m",
  ratedPower: 15,
  ratedPowerUnit: "kW",
  ratedSpeed: 1450,
  targetSpeed: 960,
  speedUnit: "rpm",
  source: "manual",
  remark: "",
}

export const usePumpStore = create<PumpStore>((set, get) => ({
  currentRequest: { ...defaultRequest },
  currentRecord: null,
  records: null,
  loading: false,
  error: null,
  compareIds: [],
  compareRecords: null,

  setCurrentRequest: (req) =>
    set((state) => ({
      currentRequest: { ...state.currentRequest, ...req },
    })),

  resetCurrentRequest: () =>
    set({ currentRequest: { ...defaultRequest }, currentRecord: null }),

  submitCalculation: async () => {
    set({ loading: true, error: null })
    try {
      const res = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(get().currentRequest),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      set({ currentRecord: json.data, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  fetchRecords: async (filter?: RecordFilter) => {
    set({ loading: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filter?.status) params.set("status", filter.status)
      if (filter?.source) params.set("source", filter.source)
      if (filter?.keyword) params.set("keyword", filter.keyword)
      if (filter?.dateFrom) params.set("dateFrom", filter.dateFrom)
      if (filter?.dateTo) params.set("dateTo", filter.dateTo)
      if (filter?.page) params.set("page", String(filter.page))
      if (filter?.pageSize) params.set("pageSize", String(filter.pageSize))
      const res = await fetch(`/api/records?${params}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      set({ records: json.data, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  fetchRecordById: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`/api/records/${id}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      set({ currentRecord: json.data, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  advanceStatus: async (id, status, operator, comment?) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`/api/records/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, operator, comment }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      set({ currentRecord: json.data, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  deleteRecord: async (id) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`/api/records/${id}`, { method: "DELETE" })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      set({ loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  toggleCompareId: (id) =>
    set((state) => ({
      compareIds: state.compareIds.includes(id)
        ? state.compareIds.filter((x) => x !== id)
        : [...state.compareIds, id],
    })),

  clearCompareIds: () => set({ compareIds: [], compareRecords: null }),

  fetchComparison: async (name) => {
    set({ loading: true, error: null })
    try {
      const ids = get().compareIds
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordIds: ids, name }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      set({ compareRecords: json.data.records, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  exportRecord: async (id, format) => {
    try {
      const res = await fetch(`/api/export/${id}?format=${format}`)
      const blob = await res.blob()
      downloadBlob(blob, `pump-report-${id}.${format}`)
    } catch (err: any) {
      set({ error: err.message })
    }
  },

  exportBatch: async (ids, format) => {
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, format }),
      })
      const blob = await res.blob()
      downloadBlob(blob, `pump-report-batch.${format}`)
    } catch (err: any) {
      set({ error: err.message })
    }
  },
}))

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
