import { create } from 'zustand'
import type { MonteCarloResult, FilterParams, DataRecord } from '@/types'

interface SimulationState {
  result: MonteCarloResult | null
  params: FilterParams | null
  records: DataRecord[] | null
  recordCount: number
  lastUpdated: string | null
  isStale: boolean
  setResult: (result: MonteCarloResult, params: FilterParams, records: DataRecord[]) => void
  markStale: () => void
  clearResult: () => void
  checkConsistency: (currentParams: FilterParams, currentRecords: DataRecord[]) => { isConsistent: boolean; reason?: string }
}

function paramsEqual(a: FilterParams, b: FilterParams): boolean {
  return (
    a.unit === b.unit &&
    a.confidenceLevel === b.confidenceLevel &&
    a.simulationCount === b.simulationCount &&
    a.sourceTypes.length === b.sourceTypes.length &&
    a.sourceTypes.every((t) => b.sourceTypes.includes(t))
  )
}

function recordsEqual(a: DataRecord[], b: DataRecord[]): boolean {
  if (a.length !== b.length) return false
  const aIds = new Set(a.map((r) => r.id))
  return b.every((r) => aIds.has(r.id))
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  result: null,
  params: null,
  records: null,
  recordCount: 0,
  lastUpdated: null,
  isStale: false,

  setResult: (result, params, records) =>
    set({
      result,
      params: { ...params, sourceTypes: [...params.sourceTypes] },
      records: records.map((r) => ({ ...r })),
      recordCount: records.length,
      lastUpdated: new Date().toISOString(),
      isStale: false,
    }),

  markStale: () =>
    set((state) => ({
      isStale: state.result !== null ? true : state.isStale,
    })),

  clearResult: () =>
    set({
      result: null,
      params: null,
      records: null,
      recordCount: 0,
      lastUpdated: null,
      isStale: false,
    }),

  checkConsistency: (currentParams, currentRecords) => {
    const state = get()
    if (!state.result || !state.params || !state.records) {
      return { isConsistent: false, reason: '暂无模拟数据' }
    }
    if (state.isStale) {
      return { isConsistent: false, reason: '数据已过期，参数或记录已变更' }
    }
    if (!paramsEqual(state.params, currentParams)) {
      return { isConsistent: false, reason: '筛选参数已变更' }
    }
    if (!recordsEqual(state.records, currentRecords)) {
      return { isConsistent: false, reason: '记录数据已变更' }
    }
    return { isConsistent: true }
  },
}))
