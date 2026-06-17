import { create } from 'zustand'
import type { MonteCarloResult, FilterParams } from '@/types'

interface SimulationState {
  result: MonteCarloResult | null
  params: FilterParams | null
  recordCount: number
  lastUpdated: string | null
  setResult: (result: MonteCarloResult, params: FilterParams, recordCount: number) => void
  clearResult: () => void
}

export const useSimulationStore = create<SimulationState>((set) => ({
  result: null,
  params: null,
  recordCount: 0,
  lastUpdated: null,

  setResult: (result, params, recordCount) =>
    set({
      result,
      params: { ...params },
      recordCount,
      lastUpdated: new Date().toISOString(),
    }),

  clearResult: () =>
    set({
      result: null,
      params: null,
      recordCount: 0,
      lastUpdated: null,
    }),
}))
