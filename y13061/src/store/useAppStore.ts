import { create } from 'zustand'
import type { AbnormalType } from '@/data/mockData'
import { timePoints } from '@/data/mockData'

interface AppState {
  selectedWellId: string | null
  currentTimePointId: string
  abnormalFilter: AbnormalType[]
  selectedWellIdsForFilter: string[]
  isPlaying: boolean
  selectWell: (id: string | null) => void
  setCurrentTimePoint: (id: string) => void
  toggleAbnormal: (type: AbnormalType) => void
  toggleWellFilter: (id: string) => void
  clearFilters: () => void
  setPlaying: (v: boolean) => void
  nextTimePoint: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  selectedWellId: null,
  currentTimePointId: timePoints[0].id,
  abnormalFilter: [],
  selectedWellIdsForFilter: [],
  isPlaying: false,
  selectWell: (id) => set({ selectedWellId: id }),
  setCurrentTimePoint: (id) => set({ currentTimePointId: id }),
  toggleAbnormal: (type) =>
    set((state) => {
      const has = state.abnormalFilter.includes(type)
      return {
        abnormalFilter: has
          ? state.abnormalFilter.filter((t) => t !== type)
          : [...state.abnormalFilter, type],
      }
    }),
  toggleWellFilter: (id) =>
    set((state) => {
      const has = state.selectedWellIdsForFilter.includes(id)
      return {
        selectedWellIdsForFilter: has
          ? state.selectedWellIdsForFilter.filter((w) => w !== id)
          : [...state.selectedWellIdsForFilter, id],
      }
    }),
  clearFilters: () => set({ abnormalFilter: [], selectedWellIdsForFilter: [] }),
  setPlaying: (v) => set({ isPlaying: v }),
  nextTimePoint: () => {
    const ids = timePoints.map((t) => t.id)
    const idx = ids.indexOf(get().currentTimePointId)
    const next = ids[(idx + 1) % ids.length]
    set({ currentTimePointId: next })
  },
}))
