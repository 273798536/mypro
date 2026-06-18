import { create } from 'zustand'
import type { RunRecord } from '@shared/types'
import { api } from '@/lib/api'

interface AppState {
  runs: RunRecord[]
  selectedRunId: string | null
  loadingRuns: boolean
  error: string | null
  loadRuns: () => Promise<void>
  selectRun: (runId: string) => void
  ensureSelected: () => Promise<void>
  setError: (e: string | null) => void
}

export const useStore = create<AppState>((set, get) => ({
  runs: [],
  selectedRunId: null,
  loadingRuns: false,
  error: null,
  loadRuns: async () => {
    set({ loadingRuns: true, error: null })
    try {
      const runs = await api.listRuns()
      set({ runs, loadingRuns: false })
    } catch (e) {
      set({ loadingRuns: false, error: e instanceof Error ? e.message : '加载失败' })
    }
  },
  selectRun: (runId) => set({ selectedRunId: runId }),
  ensureSelected: async () => {
    if (get().selectedRunId) return
    const runs = get().runs
    if (runs.length === 0) {
      try {
        const latest = await api.getLatest()
        if (latest.current) set({ selectedRunId: latest.current.runId })
      } catch {
        /* ignore */
      }
    } else {
      set({ selectedRunId: runs[0].runId })
    }
  },
  setError: (e) => set({ error: e }),
}))
