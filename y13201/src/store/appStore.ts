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

function http<T>(
  url: string,
  init?: RequestInit,
): Promise<T & { _status: number; _ok: boolean }> {
  return fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  }).then(async (res) => {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
    return {
      ...(body as T),
      _status: res.status,
      _ok: res.ok,
    } as T & { _status: number; _ok: boolean }
  })
}

export function normalizeClientConflict(
  c: ConflictRecord | null | undefined,
): ConflictRecord | null {
  if (!c) return null
  const next = { ...c }
  const authFilled = !!next.auth_expired || (next.auth_note && next.auth_note.trim().length > 0)
  if (authFilled) {
    next.auth_expired = 1
    next.status = 'auth_expired'
  }
  return next
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
      const res = await http<
        {
          success: boolean
          data?: ConflictRecord
          error?: string
          field?: string
          warnings?: string[]
          normalized?: boolean
          info?: string
        } & { _status: number; _ok: boolean }
      >(`/api/conflicts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })

      if (!res._ok || !res.success) {
        const errByStatus: Record<number, string> = {
          400: '请求参数有误',
          404: '冲突记录不存在，可能已被删除，请刷新',
          500: '服务器写入失败',
        }
        const prefix =
          errByStatus[res._status] ||
          `请求失败（HTTP ${res._status || '未知状态'}）`
        const field = res.field ? `（字段：${res.field}）` : ''
        const detail = res.error ? `：${res.error}` : '。请稍后重试。'
        get().pushToast('error', `${prefix}${field}${detail}`)
        return false
      }

      if (res.data) {
        const normalizedData = normalizeClientConflict(res.data)
        if (normalizedData && JSON.stringify(normalizedData) !== JSON.stringify(res.data)) {
          get().pushToast(
            'info',
            '前端对返回值做了二次归一，确保字段与状态一致',
          )
        }
        const finalData = normalizedData ?? res.data
        const { conflicts } = get()
        const next = conflicts.map((c) =>
          c.id === id ? { ...c, ...finalData } : c,
        )
        set({ conflicts: next })
        if (get().currentConflict?.id === id) {
          set({
            currentConflict: { ...get().currentConflict!, ...finalData },
          })
        }

        if (res.warnings && res.warnings.length > 0) {
          get().pushToast('info', `系统提示：${res.warnings.join('；')}`)
        }

        const summary = res.normalized
          ? `已保存并归一：${res.info || '数据已同步'}`
          : res.info || '备注已同步，清单也已更新'
        get().pushToast('success', summary)

        void get().fetchSummary()
        void get().fetchConflictDetail(id)
        return true
      }

      get().pushToast('error', '后端未返回更新后的数据，请刷新确认')
      return false
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      get().pushToast(
        'error',
        `网络或解析错误（${msg}）。请检查服务状态后重试。`,
      )
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
