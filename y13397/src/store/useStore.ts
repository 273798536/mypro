import { create } from "zustand"
import type { ReplayRecord, StatusFilter, Report } from "@/types"
import { replayRecords, versionComparisons } from "@/data/mock"

interface AppState {
  records: ReplayRecord[]
  statusFilter: StatusFilter
  selectedRecordId: string | null
  setStatusFilter: (filter: StatusFilter) => void
  selectRecord: (id: string | null) => void
  getFilteredRecords: () => ReplayRecord[]
  getRecordById: (id: string) => ReplayRecord | undefined
  getComparison: (recordId: string) => typeof versionComparisons[string] | undefined
  generateReport: () => Report
}

export const useStore = create<AppState>((set, get) => ({
  records: replayRecords,
  statusFilter: "all",
  selectedRecordId: null,
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  selectRecord: (id) => set({ selectedRecordId: id }),
  getFilteredRecords: () => {
    const { records, statusFilter } = get()
    if (statusFilter === "all") return records
    return records.filter((r) => r.status === statusFilter)
  },
  getRecordById: (id) => {
    return get().records.find((r) => r.id === id)
  },
  getComparison: (recordId) => {
    return versionComparisons[recordId]
  },
  generateReport: () => {
    const { records } = get()
    return {
      generatedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
      processedItems: records.filter((r) => r.status === "processed"),
      pendingMaterialItems: records.filter((r) => r.status === "pending_material"),
      manualOverrideItems: records.filter((r) => r.status === "manual_override"),
    }
  },
}))
