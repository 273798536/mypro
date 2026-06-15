import { create } from "zustand"
import {
  ScreenshotRecord,
  FilterCriteria,
  RecognizedData,
  ManualAnnotation,
  VersionSnapshot,
  RecordStatus,
} from "@/types"
import { loadRecords, saveRecords, applyFilter, buildFilterCriteriaText } from "@/utils/storage"
import { createSeedData } from "@/utils/seedData"

interface AppState {
  records: ScreenshotRecord[]
  selectedId: string | null
  filter: FilterCriteria
  initialized: boolean

  init: () => void
  addRecords: (files: File[]) => void
  selectRecord: (id: string | null) => void
  setFilter: (f: Partial<FilterCriteria>) => void
  resetFilter: () => void
  addManualAnnotation: (
    id: string,
    overrideData: RecognizedData,
    reason: string
  ) => void
  removeManualAnnotation: (id: string) => void
  updateNotes: (
    id: string,
    field: "rehearsalNote" | "authorizationNote",
    value: string
  ) => void
  rescan: (id: string) => void
  getFilteredRecords: () => ScreenshotRecord[]
  getSelectedRecord: () => ScreenshotRecord | null
  getSummary: () => { filterCriteriaText: string; total: number; anomaly: number; annotated: number; pending: number }
}

const DEFAULT_FILTER: FilterCriteria = {
  statuses: [],
  dateRange: null,
  hasAnomaly: null,
  hasManualAnnotation: null,
}

function persist(records: ScreenshotRecord[]) {
  saveRecords(records)
}

export const useStore = create<AppState>((set, get) => ({
  records: [],
  selectedId: null,
  filter: { ...DEFAULT_FILTER },
  initialized: false,

  init: () => {
    const existing = loadRecords()
    if (existing.length > 0) {
      set({ records: existing, initialized: true })
    } else {
      const seed = createSeedData()
      persist(seed)
      set({ records: seed, initialized: true })
    }
  },

  addRecords: (files: File[]) => {
    const newRecords: ScreenshotRecord[] = files.map((f, i) => {
      const id = `upload-${Date.now()}-${i}`
      const rec: ScreenshotRecord = {
        id,
        fileName: f.name,
        uploadTime: new Date().toISOString(),
        status: "pending",
        recognizedData: null,
        manualAnnotation: null,
        rehearsalNote: "",
        authorizationNote: "",
        versions: [],
        isBoundarySample: false,
      }
      return rec
    })
    const updated = [...get().records, ...newRecords]
    persist(updated)
    set({ records: updated })
  },

  selectRecord: (id) => set({ selectedId: id }),

  setFilter: (f) => {
    const current = get().filter
    const next = { ...current, ...f }
    set({ filter: next })
  },

  resetFilter: () => set({ filter: { ...DEFAULT_FILTER } }),

  addManualAnnotation: (id, overrideData, reason) => {
    const records = get().records.map((r) => {
      if (r.id !== id) return r
      const annotation: ManualAnnotation = {
        overrideData,
        reason,
        timestamp: new Date().toISOString(),
      }
      const newVersion: VersionSnapshot = {
        versionId: `v-${Date.now()}`,
        timestamp: new Date().toISOString(),
        trigger: "manual_annotation",
        data: overrideData,
        annotationApplied: true,
        notesIncluded: !!r.rehearsalNote || !!r.authorizationNote,
      }
      return {
        ...r,
        manualAnnotation: annotation,
        status: "annotated" as RecordStatus,
        versions: [...r.versions, newVersion],
      }
    })
    persist(records)
    set({ records })
  },

  removeManualAnnotation: (id) => {
    const records = get().records.map((r) => {
      if (r.id !== id) return r
      const status: RecordStatus = r.recognizedData
        ? r.recognizedData.introType.includes("置信度低") || !r.recognizedData.participants.length
          ? "anomaly"
          : "recognized"
        : "pending"
      return { ...r, manualAnnotation: null, status }
    })
    persist(records)
    set({ records })
  },

  updateNotes: (id, field, value) => {
    const records = get().records.map((r) => {
      if (r.id !== id) return r
      return { ...r, [field]: value }
    })
    persist(records)
    set({ records })
  },

  rescan: (id) => {
    const records = get().records.map((r) => {
      if (r.id !== id) return r
      const data = r.manualAnnotation
        ? r.manualAnnotation.overrideData
        : r.recognizedData || {
            participants: ["（待确认）"],
            shares: [{ name: "（待确认）", ratio: 0 }],
            introType: "（需人工确认）",
          }
      const newVersion: VersionSnapshot = {
        versionId: `v-${Date.now()}`,
        timestamp: new Date().toISOString(),
        trigger: "rescan",
        data,
        annotationApplied: !!r.manualAnnotation,
        notesIncluded: !!r.rehearsalNote || !!r.authorizationNote,
      }
      const newStatus: RecordStatus = r.manualAnnotation
        ? "annotated"
        : data.introType.includes("置信度低") || data.introType.includes("需人工确认")
        ? "anomaly"
        : "recognized"
      return {
        ...r,
        recognizedData: data,
        status: newStatus,
        versions: [...r.versions, newVersion],
      }
    })
    persist(records)
    set({ records })
  },

  getFilteredRecords: () => applyFilter(get().records, get().filter),

  getSelectedRecord: () => {
    const { records, selectedId } = get()
    return records.find((r) => r.id === selectedId) || null
  },

  getSummary: () => {
    const filtered = get().getFilteredRecords()
    return {
      filterCriteriaText: buildFilterCriteriaText(get().filter),
      total: filtered.length,
      anomaly: filtered.filter((r) => r.status === "anomaly").length,
      annotated: filtered.filter((r) => r.manualAnnotation !== null).length,
      pending: filtered.filter((r) => r.status === "pending").length,
    }
  },
}))
