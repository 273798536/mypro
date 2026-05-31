import { create } from 'zustand'
import type { FilterState } from '@/types'

interface FilterStore extends FilterState {
  setStartDate: (d: string) => void
  setEndDate: (d: string) => void
  setMemberStatus: (s: string) => void
  setPackageStatus: (s: string) => void
  setExceptionStatus: (s: string) => void
  setSearchQuery: (q: string) => void
  resetFilters: () => void
  getFilters: () => Record<string, string>
}

const initialState: FilterState = {
  startDate: '',
  endDate: '',
  memberStatus: '',
  packageStatus: '',
  exceptionStatus: '',
  searchQuery: '',
}

export const useFilterStore = create<FilterStore>((set, get) => ({
  ...initialState,
  setStartDate: (startDate) => set({ startDate }),
  setEndDate: (endDate) => set({ endDate }),
  setMemberStatus: (memberStatus) => set({ memberStatus }),
  setPackageStatus: (packageStatus) => set({ packageStatus }),
  setExceptionStatus: (exceptionStatus) => set({ exceptionStatus }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  resetFilters: () => set(initialState),
  getFilters: () => {
    const state = get()
    const filters: Record<string, string> = {}
    if (state.startDate) filters.startDate = state.startDate
    if (state.endDate) filters.endDate = state.endDate
    if (state.memberStatus) filters.memberStatus = state.memberStatus
    if (state.packageStatus) filters.packageStatus = state.packageStatus
    if (state.exceptionStatus) filters.exceptionStatus = state.exceptionStatus
    return filters
  },
}))
