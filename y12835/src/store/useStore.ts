import { create } from 'zustand'

interface CurrentUser {
  name: string
  role: 'admin' | 'technician' | 'viewer'
}

interface AppState {
  currentUser: CurrentUser | null
  setCurrentUser: (user: CurrentUser | null) => void
  role: 'technician' | 'student'
  toggleRole: () => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useStore = create<AppState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  role: (localStorage.getItem('role') as 'technician' | 'student') || 'technician',
  toggleRole: () =>
    set((s) => {
      const next = s.role === 'technician' ? 'student' : 'technician'
      localStorage.setItem('role', next)
      return { role: next }
    }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
