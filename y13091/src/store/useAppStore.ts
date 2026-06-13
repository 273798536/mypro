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
  resetAll: () => void
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

function mergeRecordsWithDefaults(saved: SensorRecord[]): SensorRecord[] {
  return MOCK_RECORDS.map((defaultRec) => {
    const savedRec = saved.find((s) => s.id === defaultRec.id)
    if (!savedRec) return defaultRec
    return {
      ...defaultRec,
      status: savedRec.status,
      manualNote: savedRec.manualNote,
    }
  })
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

function loadRecordsFromStorage(): SensorRecord[] {
  try {
    const saved = localStorage.getItem("btinsp_records")
    if (saved) {
      const parsed = JSON.parse(saved) as SensorRecord[]
      return mergeRecordsWithDefaults(parsed)
    }
  } catch {
    /* ignore */
  }
  return MOCK_RECORDS
}

function saveRecordsToStorage(records: SensorRecord[]) {
  try {
    const toSave = records.map((r) => ({
      id: r.id,
      status: r.status,
      manualNote: r.manualNote,
    }))
    localStorage.setItem("btinsp_records", JSON.stringify(toSave))
  } catch {
    /* ignore */
  }
}

function filterApiReturns(
  apiReturns: ApiReturnItem[],
  filter: FilterState,
  records: SensorRecord[]
): ApiReturnItem[] {
  return apiReturns.filter((item) => {
    const record = records.find((r) => r.id === item.recordId)
    if (!record) return false
    return (
      filter.sensorTypes.includes(record.sensorType) &&
      filter.statuses.includes(record.status)
    )
  })
}

export const useAppStore = create<AppState>((set, get) => {
  const initialRecords = loadRecordsFromStorage()
  const initialFilter = loadFilterFromStorage()
  const initialAllApiReturns = buildApiReturns(initialRecords, initialFilter)

  return {
    records: initialRecords,
    filterState: initialFilter,
    selectedRecordId: null,
    selectedSegmentIndex: 0,
    apiReturns: initialAllApiReturns,
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
      saveRecordsToStorage(updated)
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
      saveRecordsToStorage(updated)
      set({
        records: updated,
        apiReturns: buildApiReturns(updated, filterState),
      })
    },

    resetAll: () => {
      try {
        localStorage.removeItem("btinsp_records")
      } catch {
        /* ignore */
      }
      saveFilterToStorage(DEFAULT_FILTER)
      set({
        records: MOCK_RECORDS,
        filterState: DEFAULT_FILTER,
        apiReturns: buildApiReturns(MOCK_RECORDS, DEFAULT_FILTER),
      })
    },

    toggleDetailPanel: () => {
      set((s) => ({ detailPanelOpen: !s.detailPanelOpen }))
    },

    toggleApiPanel: () => {
      set((s) => ({ apiPanelExpanded: !s.apiPanelExpanded }))
    },
  }
})

export function useFilteredApiReturns(): ApiReturnItem[] {
  const { apiReturns, filterState, records } = useAppStore()
  return filterApiReturns(apiReturns, filterState, records)
}
