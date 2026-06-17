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
  exportCSVWithBOM: () => Blob
}

const applyFilters = (
  records: TorqueRecord[],
  timeWindow: TimeWindow,
  filters: FilterOptions,
  selectedComponent: MotorComponent | null
): TorqueRecord[] => {
  const compTypeById = new Map<string, string>()
  allComponents.forEach((c) => compTypeById.set(c.id, c.type))

  let result = records
  if (filters.equipmentId) {
    result = result.filter((r) => r.equipmentId === filters.equipmentId)
  }
  if (timeWindow.start && timeWindow.end) {
    result = result.filter(
      (r) => r.timestamp >= timeWindow.start && r.timestamp <= timeWindow.end
    )
  }
  if (selectedComponent) {
    result = result.filter((r) => r.componentId === selectedComponent.id)
  } else if (filters.componentType) {
    result = result.filter(
      (r) => compTypeById.get(r.componentId) === filters.componentType
    )
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
    const compNameById = new Map<string, string>()
    const compTypeById = new Map<string, string>()
    const compTypeLabel: Record<string, string> = {
      stator: '定子', rotor: '转子', bearing: '轴承',
      shaft: '轴', housing: '壳体', winding: '绕组', sensor: '传感器',
    }
    allComponents.forEach((c) => {
      compNameById.set(c.id, c.name)
      compTypeById.set(c.id, compTypeLabel[c.type] ?? c.type)
    })
    const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const header = ['ID', '设备ID', '零部件ID', '零部件名称', '零部件类型',
      '实测扭矩(N·m)', '额定扭矩(N·m)', '误差(%)', '严重等级', '时间戳']
      .map(q).join(',')
    const severityLabel: Record<string, string> = {
      normal: '正常', warning: '警告', critical: '严重',
    }
    const rows = records.map((r) => [
      r.id, r.equipmentId, r.componentId,
      compNameById.get(r.componentId) ?? r.componentId,
      compTypeById.get(r.componentId) ?? '',
      r.measuredTorque.toFixed(2),
      String(r.ratedTorque),
      String(r.errorPercent),
      severityLabel[r.severity] ?? r.severity,
      new Date(r.timestamp).toLocaleString('zh-CN', { hour12: false }),
    ].map(q).join(','))
    return [header, ...rows].join('\r\n')
  },

  exportCSVWithBOM: () => {
    const csv = get().exportCSV()
    const BOM = '\uFEFF'
    return new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
  },
}))
