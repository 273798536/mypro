import { create } from "zustand"
import {
  type SensorRecord,
  type FilterState,
  type ApiReturnItem,
  MOCK_RECORDS,
  DEFAULT_FILTER,
} from "@/data/mockData"

interface AppState {
  records: SensorRecord[]
  filterState: FilterState
  selectedRecordId: string | null
  selectedSegmentIndex: number
  apiReturns: ApiReturnItem[]
  detailPanelOpen: boolean
  apiPanelExpanded: boolean

  setFilterState: (filter: FilterState) => void
  selectRecord: (recordId: string | null) => void
  selectSegment: (index: number) => void
  updateManualNote: (recordId: string, note: string) => void
  updateRecordStatus: (
    recordId: string,
    status: SensorRecord["status"]
  ) => void
  toggleDetailPanel: () => void
  toggleApiPanel: () => void
}

function buildApiReturns(records: SensorRecord[], filter: FilterState): ApiReturnItem[] {
  return records.map((r) => ({
    recordId: r.id,
    sensorName: r.sensorName,
    apiReturnName: r.apiReturnName,
    timestamp: r.timeSegments[0].start,
    status: r.status,
    filterSnapshot: { ...filter },
    manualNote: r.manualNote,
    nameMismatch: r.sensorName !== r.apiReturnName,
  }))
}

function loadFilterFromStorage(): FilterState {
  try {
    const saved = localStorage.getItem("btinsp_filter")
    if (saved) return JSON.parse(saved) as FilterState
  } catch {
    /* ignore */
  }
  return DEFAULT_FILTER
}

function saveFilterToStorage(filter: FilterState) {
  try {
    localStorage.setItem("btinsp_filter", JSON.stringify(filter))
  } catch {
    /* ignore */
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  records: MOCK_RECORDS,
  filterState: loadFilterFromStorage(),
  selectedRecordId: null,
  selectedSegmentIndex: 0,
  apiReturns: buildApiReturns(MOCK_RECORDS, loadFilterFromStorage()),
  detailPanelOpen: true,
  apiPanelExpanded: true,

  setFilterState: (filter) => {
    saveFilterToStorage(filter)
    const { records } = get()
    set({
      filterState: filter,
      apiReturns: buildApiReturns(records, filter),
    })
  },

  selectRecord: (recordId) => {
    set({ selectedRecordId: recordId, selectedSegmentIndex: 0 })
  },

  selectSegment: (index) => {
    set({ selectedSegmentIndex: index })
  },

  updateManualNote: (recordId, note) => {
    const { records, filterState } = get()
    const updated = records.map((r) =>
      r.id === recordId ? { ...r, manualNote: note } : r
    )
    set({
      records: updated,
      apiReturns: buildApiReturns(updated, filterState),
    })
  },

  updateRecordStatus: (recordId, status) => {
    const { records, filterState } = get()
    const updated = records.map((r) =>
      r.id === recordId ? { ...r, status } : r
    )
    set({
      records: updated,
      apiReturns: buildApiReturns(updated, filterState),
    })
  },

  toggleDetailPanel: () => {
    set((s) => ({ detailPanelOpen: !s.detailPanelOpen }))
  },

  toggleApiPanel: () => {
    set((s) => ({ apiPanelExpanded: !s.apiPanelExpanded }))
  },
}))
