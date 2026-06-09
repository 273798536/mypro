import { create } from 'zustand'
import type { UserRole, ImportBatch, QuestionRecord, ReviewSession, Report } from '../types'

interface AppState {
  role: UserRole
  setRole: (role: UserRole) => void
  currentBatch: ImportBatch | null
  setCurrentBatch: (batch: ImportBatch | null) => void
  currentSession: ReviewSession | null
  setCurrentSession: (session: ReviewSession | null) => void
  currentReport: Report | null
  setCurrentReport: (report: Report | null) => void
  selectedRecords: QuestionRecord[]
  setSelectedRecords: (records: QuestionRecord[]) => void
  refreshTrigger: number
  triggerRefresh: () => void
}

export const useAppStore = create<AppState>((set) => ({
  role: 'assistant',
  setRole: (role) => set({ role }),
  currentBatch: null,
  setCurrentBatch: (batch) => set({ currentBatch: batch }),
  currentSession: null,
  setCurrentSession: (session) => set({ currentSession: session }),
  currentReport: null,
  setCurrentReport: (report) => set({ currentReport: report }),
  selectedRecords: [],
  setSelectedRecords: (records) => set({ selectedRecords: records }),
  refreshTrigger: 0,
  triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 }))
}))
