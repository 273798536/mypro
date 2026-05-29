import { create } from 'zustand'
import type { Distribution, BadRow, TiedRankGroup, Batch } from '../../shared/types.ts'

interface AppState {
  eventId: string | null
  batchId: string | null
  status: string | null
  hasTiedRank: boolean
  hasDispute: boolean
  hasDuplicateResend: boolean
  distributions: Distribution[]
  badRows: BadRow[]
  tiedRankGroups: TiedRankGroup[]
  batches: Batch[]
  totalCount: number
  currentPage: number
  loading: boolean
  setFilters: (filters: Partial<AppState>) => void
  setDistributions: (data: Distribution[], badRows: BadRow[], tiedGroups: TiedRankGroup[], total: number) => void
  setBatches: (batches: Batch[]) => void
  setLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  eventId: null,
  batchId: null,
  status: null,
  hasTiedRank: false,
  hasDispute: false,
  hasDuplicateResend: false,
  distributions: [],
  badRows: [],
  tiedRankGroups: [],
  batches: [],
  totalCount: 0,
  currentPage: 1,
  loading: false,
  setFilters: (filters) => set({ ...filters, currentPage: 1 }),
  setDistributions: (data, badRows, tiedGroups, total) =>
    set({ distributions: data, badRows, tiedRankGroups: tiedGroups, totalCount: total }),
  setBatches: (batches) => set({ batches }),
  setLoading: (loading) => set({ loading }),
}))
