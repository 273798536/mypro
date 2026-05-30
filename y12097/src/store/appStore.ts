import { create } from 'zustand'
import type { ProbeStatus, FanStatus } from '@/types'

interface AppState {
  currentTimeIndex: number
  isPlaying: boolean
  filters: {
    layers: number[]
    areas: string[]
    probeStatuses: ProbeStatus[]
    fanStatuses: FanStatus[]
  }
  selectedProbeId: string | null
  selectedAnomalyId: string | null
  leftPanelOpen: boolean
  rightPanelOpen: boolean

  setTimeIndex: (index: number | ((prev: number) => number)) => void
  setIsPlaying: (playing: boolean) => void
  togglePlay: () => void
  setFilters: (filters: Partial<AppState['filters']>) => void
  toggleLayer: (layer: number) => void
  toggleArea: (area: string) => void
  toggleProbeStatus: (status: ProbeStatus) => void
  toggleFanStatus: (status: FanStatus) => void
  setSelectedProbe: (id: string | null) => void
  setSelectedAnomaly: (id: string | null) => void
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  resetFilters: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentTimeIndex: 0,
  isPlaying: false,
  filters: {
    layers: [1, 2, 3, 4],
    areas: ['A区', 'B区'],
    probeStatuses: ['online', 'offline', 'overtemp'],
    fanStatuses: ['running', 'stopped'],
  },
  selectedProbeId: null,
  selectedAnomalyId: null,
  leftPanelOpen: true,
  rightPanelOpen: true,

  setTimeIndex: (index) =>
    set((state) => ({
      currentTimeIndex: typeof index === 'function' ? index(state.currentTimeIndex) : index,
    })),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  toggleLayer: (layer) =>
    set((state) => ({
      filters: {
        ...state.filters,
        layers: state.filters.layers.includes(layer)
          ? state.filters.layers.filter((l) => l !== layer)
          : [...state.filters.layers, layer],
      },
    })),

  toggleArea: (area) =>
    set((state) => ({
      filters: {
        ...state.filters,
        areas: state.filters.areas.includes(area)
          ? state.filters.areas.filter((a) => a !== area)
          : [...state.filters.areas, area],
      },
    })),

  toggleProbeStatus: (status) =>
    set((state) => ({
      filters: {
        ...state.filters,
        probeStatuses: state.filters.probeStatuses.includes(status)
          ? state.filters.probeStatuses.filter((s) => s !== status)
          : [...state.filters.probeStatuses, status],
      },
    })),

  toggleFanStatus: (status) =>
    set((state) => ({
      filters: {
        ...state.filters,
        fanStatuses: state.filters.fanStatuses.includes(status)
          ? state.filters.fanStatuses.filter((s) => s !== status)
          : [...state.filters.fanStatuses, status],
      },
    })),

  setSelectedProbe: (id) => set({ selectedProbeId: id }),
  setSelectedAnomaly: (id) => set({ selectedAnomalyId: id }),
  toggleLeftPanel: () => set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),
  toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),

  resetFilters: () =>
    set({
      filters: {
        layers: [1, 2, 3, 4],
        areas: ['A区', 'B区'],
        probeStatuses: ['online', 'offline', 'overtemp'],
        fanStatuses: ['running', 'stopped'],
      },
    }),
}))
