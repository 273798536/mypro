import { create } from 'zustand'
import type {
  Playback,
  HistoryRecord,
} from '@/shared/types'
import {
  fetchPlaybacks,
  fetchPlaybackDetail,
  rejudgePlayback,
  addNote,
  fetchHistory,
  generateReport,
  confirmPlayback,
} from '@/services/api'

interface PaginationState {
  page: number
  pageSize: number
  total: number
}

interface PlaybackState {
  playbacks: Playback[]
  pagination: PaginationState
  currentDetail: Playback | null
  history: HistoryRecord[]
  loading: boolean
  error: string | null

  loadList: (params: {
    status?: string
    keyword?: string
    page?: number
    pageSize?: number
  }) => Promise<void>

  loadDetail: (id: string) => Promise<void>

  doRejudge: (
    id: string,
    payload: { conclusion: string; reason: string; operatorName: string },
  ) => Promise<void>

  doAddNote: (
    id: string,
    payload: { content: string; operatorName: string },
  ) => Promise<void>

  loadHistory: (id: string) => Promise<void>

  doGenerateReport: (
    id: string,
    payload: { operatorName: string },
  ) => Promise<void>

  doConfirm: (
    id: string,
    payload: { operatorName: string },
  ) => Promise<void>
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  playbacks: [],
  pagination: {
    page: 1,
    pageSize: 10,
    total: 0,
  },
  currentDetail: null,
  history: [],
  loading: false,
  error: null,

  loadList: async (params) => {
    set({ loading: true, error: null })
    try {
      const res = await fetchPlaybacks(params)
      set({
        playbacks: res.list,
        pagination: {
          page: params.page || 1,
          pageSize: params.pageSize || 10,
          total: res.total,
        },
      })
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ loading: false })
    }
  },

  loadDetail: async (id) => {
    set({ loading: true, error: null })
    try {
      const detail = await fetchPlaybackDetail(id)
      set({ currentDetail: detail })
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ loading: false })
    }
  },

  doRejudge: async (id, payload) => {
    set({ loading: true, error: null })
    try {
      const detail = await rejudgePlayback(id, payload)
      set((state) => ({
        currentDetail: detail,
        playbacks: state.playbacks.map((p) =>
          p.id === id ? detail : p,
        ),
      }))
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ loading: false })
    }
  },

  doAddNote: async (id, payload) => {
    set({ loading: true, error: null })
    try {
      const note = await addNote(id, payload)
      set((state) => {
        if (state.currentDetail && state.currentDetail.id === id) {
          return {
            currentDetail: {
              ...state.currentDetail,
              notes: [...state.currentDetail.notes, note],
            },
          }
        }
        return {}
      })
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ loading: false })
    }
  },

  loadHistory: async (id) => {
    set({ loading: true, error: null })
    try {
      const history = await fetchHistory(id)
      set({ history })
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ loading: false })
    }
  },

  doGenerateReport: async (id, payload) => {
    set({ loading: true, error: null })
    try {
      const report = await generateReport(id, payload)
      set((state) => {
        if (state.currentDetail && state.currentDetail.id === id) {
          return {
            currentDetail: {
              ...state.currentDetail,
              reports: [...state.currentDetail.reports, report],
            },
          }
        }
        return {}
      })
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ loading: false })
    }
  },

  doConfirm: async (id, payload) => {
    set({ loading: true, error: null })
    try {
      const detail = await confirmPlayback(id, payload)
      set((state) => ({
        currentDetail: detail,
        playbacks: state.playbacks.map((p) =>
          p.id === id ? detail : p,
        ),
      }))
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ loading: false })
    }
  },
}))
