import { create } from 'zustand'
import type { FilterParams, RecordSource } from '@/types'

interface FilterState {
  params: FilterParams
  setUnit: (unit: string) => void
  setConfidenceLevel: (level: number) => void
  setSimulationCount: (count: number) => void
  setSourceTypes: (sources: RecordSource[]) => void
  toggleSourceType: (source: RecordSource) => void
  resetFilters: () => void
}

const defaultParams: FilterParams = {
  unit: 'mm',
  confidenceLevel: 0.95,
  simulationCount: 10000,
  sourceTypes: ['normal', 'draft', 'verbal'],
}

export const useFilterStore = create<FilterState>((set) => ({
  params: defaultParams,

  setUnit: (unit) => set((state) => ({ params: { ...state.params, unit } })),

  setConfidenceLevel: (level) =>
    set((state) => ({ params: { ...state.params, confidenceLevel: level } })),

  setSimulationCount: (count) =>
    set((state) => ({ params: { ...state.params, simulationCount: count } })),

  setSourceTypes: (sources) =>
    set((state) => ({ params: { ...state.params, sourceTypes: sources } })),

  toggleSourceType: (source) =>
    set((state) => {
      const sources = state.params.sourceTypes
      const newSources = sources.includes(source)
        ? sources.filter((s) => s !== source)
        : [...sources, source]
      return { params: { ...state.params, sourceTypes: newSources } }
    }),

  resetFilters: () => set({ params: defaultParams }),
}))
