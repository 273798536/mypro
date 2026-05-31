import { create } from 'zustand'

interface AppState {
  selectedPeriod: string
  setSelectedPeriod: (period: string) => void
  filters: {
    country: string
    status: string
    type: string
  }
  setFilter: (key: string, value: string) => void
  resetFilters: () => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

const defaultFilters = {
  country: '',
  status: '',
  type: '',
}

const now = new Date()
const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

export const useAppStore = create<AppState>((set) => ({
  selectedPeriod: defaultPeriod,
  setSelectedPeriod: (period) => set({ selectedPeriod: period }),
  filters: { ...defaultFilters },
  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}))
