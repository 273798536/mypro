import { create } from 'zustand'
import type {
  MotorComponent,
  TorqueRecord,
  ParameterSet,
  RecalcResult,
  FilterOptions,
  TimeWindow,
  ConsistencyCheck,
} from '@/types'
import {
  torqueRecords,
  defaultParameterSet,
  recalculate,
  checkConsistency,
  motorComponents as allComponents,
} from '@/data/mock'

interface AttributionStore {
  selectedComponent: MotorComponent | null
  timeWindow: TimeWindow
  filters: FilterOptions
  parameterSet: ParameterSet
  recalcResults: RecalcResult[]
  consistencyCheck: ConsistencyCheck | null
  filteredRecords: TorqueRecord[]

  selectComponent: (component: MotorComponent | null) => void
  setTimeWindow: (window: TimeWindow) => void
  setFilters: (filters: FilterOptions) => void
  updateParameterSet: (params: ParameterSet) => void
  recalculateAll: () => void
  runConsistencyCheck: () => void
  getFilteredRecords: () => TorqueRecord[]
  exportCSV: () => string
}

const applyFilters = (
  records: TorqueRecord[],
  timeWindow: TimeWindow,
  filters: FilterOptions,
  selectedComponent: MotorComponent | null
): TorqueRecord[] => {
  let result = records
  if (timeWindow.start && timeWindow.end) {
    result = result.filter(
      (r) => r.timestamp >= timeWindow.start && r.timestamp <= timeWindow.end
    )
  }
  if (selectedComponent) {
    result = result.filter((r) => r.componentId === selectedComponent.id)
  }
  if (filters.severity.length > 0) {
    result = result.filter((r) => filters.severity.includes(r.severity))
  }
  return result
}

const initialTimeWindow = { start: '2025-03-10T08:00:00', end: '2025-03-13T08:00:00' }
const initialFilters = { equipmentId: 'EQ-001' as string | null, severity: [] as ('normal' | 'warning' | 'critical')[], componentType: null as string | null, source: null as string | null }

export const useAttributionStore = create<AttributionStore>((set, get) => ({
  selectedComponent: null,
  timeWindow: initialTimeWindow,
  filters: initialFilters,
  parameterSet: { ...defaultParameterSet },
  recalcResults: [],
  consistencyCheck: null,
  filteredRecords: applyFilters(torqueRecords, initialTimeWindow, initialFilters, null),

  selectComponent: (component) => {
    const state = get()
    const newRecords = applyFilters(torqueRecords, state.timeWindow, state.filters, component)
    set({ selectedComponent: component, filteredRecords: newRecords })
  },

  setTimeWindow: (timeWindow) => {
    const state = get()
    const newRecords = applyFilters(torqueRecords, timeWindow, state.filters, state.selectedComponent)
    set({ timeWindow, filteredRecords: newRecords })
  },

  setFilters: (filters) => {
    const state = get()
    const newRecords = applyFilters(torqueRecords, state.timeWindow, filters, state.selectedComponent)
    set({ filters, filteredRecords: newRecords })
  },

  updateParameterSet: (params) => {
    set({ parameterSet: params })
  },

  recalculateAll: () => {
    const state = get()
    const previousThreshold = defaultParameterSet.safetyThreshold
    const results = allComponents.map((cmp) => {
      const componentRecords = torqueRecords.filter((r) => r.componentId === cmp.id)
      const avgError =
        componentRecords.length > 0
          ? componentRecords.reduce((s, r) => s + r.errorPercent, 0) / componentRecords.length
          : 0
      return recalculate(state.parameterSet, cmp.id, cmp.name, avgError, previousThreshold)
    })
    set({ recalcResults: results })
  },

  runConsistencyCheck: () => {
    const state = get()
    const pageRecords = state.filteredRecords
    const csvRecords = state.getFilteredRecords()
    const result = checkConsistency(pageRecords, csvRecords)
    set({ consistencyCheck: result })
  },

  getFilteredRecords: () => {
    const state = get()
    return applyFilters(torqueRecords, state.timeWindow, state.filters, state.selectedComponent)
  },

  exportCSV: () => {
    const records = get().getFilteredRecords()
    const header = 'ID,设备ID,零部件ID,实测扭矩(N·m),额定扭矩(N·m),误差(%),时间戳,严重等级'
    const rows = records.map(
      (r) =>
        `${r.id},${r.equipmentId},${r.componentId},${r.measuredTorque.toFixed(2)},${r.ratedTorque},${r.errorPercent},${r.timestamp},${r.severity}`
    )
    return [header, ...rows].join('\n')
  },
}))
