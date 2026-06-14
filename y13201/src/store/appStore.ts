import { create } from 'zustand'
import type {
  ConflictRecord,
  TrackItem,
  NoteHistoryItem,
  StatusSummary,
  ConflictStatus,
} from '@/types'

interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

interface AppState {
  conflicts: ConflictRecord[]
  tracks: Record<number, TrackItem[]>
  summary: StatusSummary | null
  currentConflict: ConflictRecord | null
  currentHistory: NoteHistoryItem[]
  toasts: Toast[]
  loading: boolean

  fetchConflicts: () => Promise<void>
  fetchSummary: () => Promise<void>
  fetchTracks: () => Promise<void>
  fetchConflictDetail: (id: string) => Promise<void>
  updateConflict: (
    id: string,
    patch: {
      note?: string
      authExpired?: boolean
      authNote?: string
      status?: ConflictStatus
    },
  ) => Promise<boolean>
  toggleTrackConfirmed: (id: string, confirmed: boolean) => Promise<boolean>
  pushToast: (type: Toast['type'], message: string) => void
  removeToast: (id: string) => void
}

function http<T>(url: string, init?: RequestInit): Promise<T> {
  return fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  }).then((res) => res.json() as Promise<T>)
}

export const useAppStore = create<AppState>((set, get) => ({
  conflicts: [],
  tracks: {},
  summary: null,
  currentConflict: null,
  currentHistory: [],
  toasts: [],
  loading: false,

  fetchConflicts: async () => {
    set({ loading: true })
    try {
      const res = await http<{ success: boolean; data: ConflictRecord[] }>(
        '/api/conflicts',
      )
      if (res.success && res.data) {
        set({ conflicts: res.data })
      }
    } finally {
      set({ loading: false })
    }
  },

  fetchSummary: async () => {
    try {
      const res = await http<{ success: boolean; data: StatusSummary }>(
        '/api/conflicts/summary',
      )
      if (res.success && res.data) {
        set({ summary: res.data })
      }
    } catch {
      /* noop */
    }
  },

  fetchTracks: async () => {
    try {
      const res = await http<{ success: boolean; data: Record<number, TrackItem[]> }>(
        '/api/tracks',
      )
      if (res.success && res.data) {
        set({ tracks: res.data })
      }
    } catch {
      /* noop */
    }
  },

  fetchConflictDetail: async (id: string) => {
    set({ loading: true })
    try {
      const res = await http<{
        success: boolean
        data: ConflictRecord & { tracks?: TrackItem[]; noteHistory?: NoteHistoryItem[] }
      }>(`/api/conflicts/${id}`)
      if (res.success && res.data) {
        const { noteHistory, tracks, ...conflict } = res.data
        set({
          currentConflict: conflict,
          currentHistory: noteHistory || [],
        })
      }
    } finally {
      set({ loading: false })
    }
  },

  updateConflict: async (id, patch) => {
    try {
      const res = await http<{ success: boolean; data?: ConflictRecord; error?: string }>(
        `/api/conflicts/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(patch),
        },
      )
      if (res.success) {
        const { conflicts } = get()
        const next = conflicts.map((c) => (c.id === id && res.data ? { ...c, ...res.data } : c))
        set({ conflicts: next })
        if (get().currentConflict?.id === id && res.data) {
          set({ currentConflict: { ...get().currentConflict!, ...res.data } })
        }
        get().pushToast('success', '备注已同步，清单也已更新')
        void get().fetchSummary()
        void get().fetchConflictDetail(id)
        return true
      } else {
        get().pushToast('error', res.error || '更新失败')
        return false
      }
    } catch {
      get().pushToast('error', '网络错误，更新失败')
      return false
    }
  },

  toggleTrackConfirmed: async (id, confirmed) => {
    try {
      const res = await http<{ success: boolean; data?: TrackItem }>(`/api/tracks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ confirmed }),
      })
      if (res.success && res.data) {
        const { tracks } = get()
        const next: typeof tracks = {}
        for (const [k, arr] of Object.entries(tracks)) {
          next[Number(k)] = arr.map((t) => (t.id === id ? (res.data as TrackItem) : t))
        }
        set({ tracks: next })
        return true
      }
      return false
    } catch {
      return false
    }
  },

  pushToast: (type, message) => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 3200)
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))
