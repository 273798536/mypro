import type { FilterState, LightPoint, TraceSnapshot } from '@/types'
import { mockRecords } from '@/data/mock'
import { create } from 'zustand'

interface AppStore {
  records: typeof mockRecords
  filteredRecords: typeof mockRecords
  selectedRecordId: string | null
  selectedLightId: string | null
  filterState: FilterState
  csvPanelOpen: boolean
  helpCardOpen: boolean
  traceSnapshots: TraceSnapshot[]
  mixedConfirmVisible: boolean
  mixedConfirmReason: string
  pendingMixedFloor: string
  pendingMixedUnit: string

  setFilter: (filter: Partial<FilterState>) => void
  applyFilter: () => void
  selectRecord: (id: string | null) => void
  selectLight: (id: string | null) => void
  toggleCsvPanel: () => void
  toggleHelpCard: () => void
  loadSample: () => void
  rerunAnalysis: () => void
  saveTraceSnapshot: () => TraceSnapshot
  restoreTrace: (id: string) => void
  showMixedConfirm: (reason: string, floor: string, unit: string) => void
  dismissMixedConfirm: () => void
  confirmMixedSplit: () => void
}

const defaultFilter: FilterState = { floor: '', unit: '', statuses: [] }

function filterRecords(records: typeof mockRecords, filter: FilterState) {
  return records.filter(r => {
    if (filter.floor && r.floor !== filter.floor) return false
    if (filter.unit && r.unit !== filter.unit) return false
    if (filter.statuses.length > 0 && !filter.statuses.includes(r.status)) return false
    return true
  })
}

export const useStore = create<AppStore>((set, get) => ({
  records: mockRecords,
  filteredRecords: mockRecords,
  selectedRecordId: null,
  selectedLightId: null,
  filterState: { ...defaultFilter },
  csvPanelOpen: false,
  helpCardOpen: false,
  traceSnapshots: [],
  mixedConfirmVisible: false,
  mixedConfirmReason: '',
  pendingMixedFloor: '',
  pendingMixedUnit: '',

  setFilter: (partial) => set(s => ({ filterState: { ...s.filterState, ...partial } })),
  applyFilter: () => set(s => ({ filteredRecords: filterRecords(s.records, s.filterState) })),
  selectRecord: (id) => set({ selectedRecordId: id, selectedLightId: null }),
  selectLight: (id) => set({ selectedLightId: id }),
  toggleCsvPanel: () => set(s => ({ csvPanelOpen: !s.csvPanelOpen })),
  toggleHelpCard: () => set(s => ({ helpCardOpen: !s.helpCardOpen })),
  loadSample: () => set({
    records: mockRecords,
    filteredRecords: mockRecords,
    selectedRecordId: mockRecords[0].id,
    selectedLightId: null,
    filterState: { ...defaultFilter },
  }),
  rerunAnalysis: () => set(s => ({
    filteredRecords: filterRecords(s.records, s.filterState),
    selectedLightId: null,
  })),
  saveTraceSnapshot: () => {
    const s = get()
    const snap: TraceSnapshot = {
      id: `TR-${Date.now().toString(36).toUpperCase()}`,
      filterState: { ...s.filterState },
      selectedLightId: s.selectedLightId,
      selectedRecordId: s.selectedRecordId,
      timestamp: new Date().toISOString(),
    }
    set(state => ({ traceSnapshots: [...state.traceSnapshots, snap] }))
    return snap
  },
  restoreTrace: (id) => {
    const snap = get().traceSnapshots.find(t => t.id === id)
    if (!snap) return
    set({
      filterState: { ...snap.filterState },
      selectedLightId: snap.selectedLightId,
      selectedRecordId: snap.selectedRecordId,
      filteredRecords: filterRecords(get().records, snap.filterState),
    })
  },
  showMixedConfirm: (reason, floor, unit) => set({
    mixedConfirmVisible: true,
    mixedConfirmReason: reason,
    pendingMixedFloor: floor,
    pendingMixedUnit: unit,
  }),
  dismissMixedConfirm: () => set({
    mixedConfirmVisible: false,
    mixedConfirmReason: '',
    pendingMixedFloor: '',
    pendingMixedUnit: '',
  }),
  confirmMixedSplit: () => {
    const s = get()
    set({
      filterState: { ...s.filterState, floor: s.pendingMixedFloor, unit: s.pendingMixedUnit },
      mixedConfirmVisible: false,
      mixedConfirmReason: '',
      pendingMixedFloor: '',
      pendingMixedUnit: '',
    })
    get().applyFilter()
  },
}))

export function getSelectedRecordLights(store: AppStore): LightPoint[] {
  if (!store.selectedRecordId) return []
  const rec = store.filteredRecords.find(r => r.id === store.selectedRecordId)
  return rec?.lights ?? []
}

export function getSelectedLight(store: AppStore): LightPoint | null {
  if (!store.selectedRecordId || !store.selectedLightId) return null
  const rec = store.filteredRecords.find(r => r.id === store.selectedRecordId)
  return rec?.lights.find(l => l.id === store.selectedLightId) ?? null
}
