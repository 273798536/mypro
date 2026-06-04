import { create } from "zustand"
import type {
  Defect,
  DefectDetail,
  ColorRule,
  CreateDefectRequest,
  ImportResult,
  ExportConsistencyCheck,
} from "@/types"

interface DefectFilters {
  status?: string
  type?: string
  batchId?: string
}

interface DefectStore {
  defects: Defect[]
  currentDefect: DefectDetail | null
  colorRules: ColorRule[]
  filters: DefectFilters
  loading: boolean
  fetchDefects: (workshopId: string) => Promise<void>
  fetchDefect: (workshopId: string, defectId: string) => Promise<void>
  createDefect: (workshopId: string, data: CreateDefectRequest) => Promise<void>
  updateDefect: (workshopId: string, defectId: string, data: Record<string, unknown>) => Promise<void>
  transitionStatus: (workshopId: string, defectId: string, toStatus: string, operator: string) => Promise<void>
  addOpinion: (workshopId: string, defectId: string, content: string, author: string) => Promise<void>
  batchUpdateStatus: (workshopId: string, defectIds: string[], status: string) => Promise<void>
  fetchColorRules: (workshopId: string) => Promise<void>
  createColorRule: (workshopId: string, data: Record<string, unknown>) => Promise<void>
  updateColorRule: (workshopId: string, ruleId: string, data: Record<string, unknown>) => Promise<void>
  deleteColorRule: (workshopId: string, ruleId: string) => Promise<void>
  setFilters: (filters: Partial<DefectFilters>) => void
  importData: (workshopId: string, data: Record<string, unknown>) => Promise<ImportResult>
  exportCheck: (workshopId: string) => Promise<ExportConsistencyCheck>
  exportData: (workshopId: string, options: Record<string, unknown>) => Promise<void>
}

export const useDefectStore = create<DefectStore>((set, get) => ({
  defects: [],
  currentDefect: null,
  colorRules: [],
  filters: {},
  loading: false,

  fetchDefects: async (workshopId) => {
    set({ loading: true })
    try {
      const params = new URLSearchParams()
      const { filters } = get()
      if (filters.status) params.set("status", filters.status)
      if (filters.type) params.set("type", filters.type)
      if (filters.batchId) params.set("batchId", filters.batchId)
      const qs = params.toString()
      const res = await fetch(`/api/workshops/${workshopId}/defects${qs ? `?${qs}` : ""}`)
      const json = await res.json()
      set({ defects: json.data ?? [], loading: false })
    } catch {
      set({ loading: false })
    }
  },

  fetchDefect: async (workshopId, defectId) => {
    set({ loading: true })
    try {
      const res = await fetch(`/api/workshops/${workshopId}/defects/${defectId}`)
      const json = await res.json()
      set({ currentDefect: json.data ?? null, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  createDefect: async (workshopId, data) => {
    set({ loading: true })
    try {
      await fetch(`/api/workshops/${workshopId}/defects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      await get().fetchDefects(workshopId)
    } catch {
      set({ loading: false })
    }
  },

  updateDefect: async (workshopId, defectId, data) => {
    set({ loading: true })
    try {
      await fetch(`/api/workshops/${workshopId}/defects/${defectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      await get().fetchDefects(workshopId)
    } catch {
      set({ loading: false })
    }
  },

  transitionStatus: async (workshopId, defectId, toStatus, operator) => {
    set({ loading: true })
    try {
      await fetch(`/api/workshops/${workshopId}/defects/${defectId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus, operator }),
      })
      await get().fetchDefect(workshopId, defectId)
    } catch {
      set({ loading: false })
    }
  },

  addOpinion: async (workshopId, defectId, content, author) => {
    set({ loading: true })
    try {
      await fetch(`/api/workshops/${workshopId}/defects/${defectId}/opinions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, author }),
      })
      await get().fetchDefect(workshopId, defectId)
    } catch {
      set({ loading: false })
    }
  },

  batchUpdateStatus: async (workshopId, defectIds, status) => {
    set({ loading: true })
    try {
      await fetch(`/api/workshops/${workshopId}/defects/batch-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defectIds, status }),
      })
      await get().fetchDefects(workshopId)
    } catch {
      set({ loading: false })
    }
  },

  fetchColorRules: async (workshopId) => {
    try {
      const res = await fetch(`/api/workshops/${workshopId}/color-rules`)
      const json = await res.json()
      set({ colorRules: json.data ?? [] })
    } catch {}
  },

  createColorRule: async (workshopId, data) => {
    try {
      await fetch(`/api/workshops/${workshopId}/color-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      await get().fetchColorRules(workshopId)
    } catch {}
  },

  updateColorRule: async (workshopId, ruleId, data) => {
    try {
      await fetch(`/api/workshops/${workshopId}/color-rules/${ruleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      await get().fetchColorRules(workshopId)
    } catch {}
  },

  deleteColorRule: async (workshopId, ruleId) => {
    try {
      await fetch(`/api/workshops/${workshopId}/color-rules/${ruleId}`, {
        method: "DELETE",
      })
      await get().fetchColorRules(workshopId)
    } catch {}
  },

  setFilters: (filters) => {
    set((state) => ({ filters: { ...state.filters, ...filters } }))
  },

  importData: async (workshopId, data) => {
    set({ loading: true })
    try {
      const res = await fetch(`/api/workshops/${workshopId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      await get().fetchDefects(workshopId)
      set({ loading: false })
      return json.data as ImportResult
    } catch {
      set({ loading: false })
      throw new Error("导入失败")
    }
  },

  exportCheck: async (workshopId) => {
    try {
      const res = await fetch(`/api/workshops/${workshopId}/export-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      return json.data as ExportConsistencyCheck
    } catch {
      throw new Error("导出校验失败")
    }
  },

  exportData: async (workshopId, options) => {
    set({ loading: true })
    try {
      const res = await fetch(`/api/workshops/${workshopId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `defects-${workshopId}.csv`
      a.click()
      URL.revokeObjectURL(url)
      set({ loading: false })
    } catch {
      set({ loading: false })
      throw new Error("导出失败")
    }
  },
}))
