import { create } from 'zustand'
import type { FilterHistory, FilterParams, MonteCarloResult } from '@/types'
import { generateId } from '@/utils/format'

interface HistoryState {
  history: FilterHistory[]
  addHistory: (params: FilterParams, result: MonteCarloResult, recordCount: number) => void
  clearHistory: () => void
  getLatest: () => FilterHistory | null
  restoreFromHistory: (id: string) => FilterParams | null
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: [],

  addHistory: (params, result, recordCount) => {
    const entry: FilterHistory = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      filterParams: { ...params },
      resultSnapshot: {
        mean: result.mean,
        stdDev: result.stdDev,
        confidenceInterval: [result.confidenceInterval.lower, result.confidenceInterval.upper],
        recordCount,
      },
    }
    set((state) => ({ history: [entry, ...state.history].slice(0, 50) }))
  },

  clearHistory: () => set({ history: [] }),

  getLatest: () => {
    const history = get().history
    return history.length > 0 ? history[0] : null
  },

  restoreFromHistory: (id) => {
    const entry = get().history.find((h) => h.id === id)
    return entry ? entry.filterParams : null
  },
}))
