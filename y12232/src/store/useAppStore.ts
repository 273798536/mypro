import { create } from 'zustand'

interface CurrentUser {
  username: string
  role: 'operator' | 'reviewer'
}

interface AppState {
  currentPage: string
  setCurrentPage: (page: string) => void
  currentUser: CurrentUser
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: '/',
  setCurrentPage: (page) => set({ currentPage: page }),
  currentUser: {
    username: '操作员',
    role: 'operator',
  },
}))
