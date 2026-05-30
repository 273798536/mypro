import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppState, HistoryEntry } from '@/types'
import { getSurfaceById } from '@/data/surfaces'
import { computeParamHash, generateId, isDuplicateEntry } from '@/utils/historyDedup'

const INITIAL_SURFACE_ID = 'ellipsoid'
const initialSurface = getSurfaceById(INITIAL_SURFACE_ID)

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeSurfaceId: INITIAL_SURFACE_ID,
      params: initialSurface?.defaultParams ?? { a: 2, b: 1.5, c: 1 },
      timelinePosition: 0,
      history: [],
      isPlaying: false,
      playbackSpeed: 1,
      crossSectionAxis: 'z',
      crossSectionPosition: 0,

      setActiveSurface: (id: string) => {
        const surface = getSurfaceById(id)
        if (!surface) return
        set({
          activeSurfaceId: id,
          params: { ...surface.defaultParams },
          timelinePosition: 0,
          crossSectionPosition: 0,
        })
      },

      setParam: (key: string, value: number) => {
        set(state => ({ params: { ...state.params, [key]: value } }))
      },

      setParams: (params: Record<string, number>) => {
        set({ params })
      },

      setTimelinePosition: (pos: number) => {
        set({ timelinePosition: pos })
      },

      setIsPlaying: (playing: boolean) => {
        set({ isPlaying: playing })
      },

      setPlaybackSpeed: (speed: number) => {
        set({ playbackSpeed: speed })
      },

      setCrossSectionAxis: (axis: 'x' | 'y' | 'z') => {
        set({ crossSectionAxis: axis })
      },

      setCrossSectionPosition: (pos: number) => {
        set({ crossSectionPosition: pos })
      },

      addHistoryEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp' | 'paramHash'>) => {
        const state = get()
        if (isDuplicateEntry(state.history, entry)) return
        const paramHash = computeParamHash(entry.surfaceId, entry.params)
        const newEntry: HistoryEntry = {
          ...entry,
          id: generateId(),
          timestamp: Date.now(),
          paramHash,
        }
        set(state => ({
          history: [...state.history, newEntry],
          timelinePosition: state.history.length,
        }))
      },

      clearHistory: () => {
        set({ history: [], timelinePosition: 0 })
      },
    }),
    {
      name: 'math-surface-hall-state',
      partialize: (state) => ({
        activeSurfaceId: state.activeSurfaceId,
        params: state.params,
        history: state.history,
        crossSectionAxis: state.crossSectionAxis,
        crossSectionPosition: state.crossSectionPosition,
      }),
    }
  )
)
