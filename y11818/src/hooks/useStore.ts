import { create } from 'zustand'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning'
  message: string
}

interface AppState {
  notifications: Notification[]
  addNotification: (type: Notification['type'], message: string) => void
  removeNotification: (id: string) => void
  refreshKey: number
  triggerRefresh: () => void
}

export const useAppStore = create<AppState>((set) => ({
  notifications: [],
  addNotification: (type, message) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2)
    set((state) => ({
      notifications: [...state.notifications, { id, type, message }],
    }))
  },
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }))
  },
  refreshKey: 0,
  triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}))
