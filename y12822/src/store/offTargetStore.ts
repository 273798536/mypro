import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Candidate, AuditLog, ReagentBatch, FilterState } from '@/types'
import { sampleCandidates, sampleAuditLogs, sampleReagentBatches } from '@/data/sampleData'

interface OffTargetStore {
  candidates: Candidate[]
  auditLogs: AuditLog[]
  reagentBatches: ReagentBatch[]
  filters: FilterState
  initialized: boolean

  initialize: () => void
  setFilters: (filters: Partial<FilterState>) => void
  resetFilters: () => void
  getFilteredCandidates: () => Candidate[]
  getCandidatesByBatch: (batchId: string) => Candidate[]
  getAuditLogsByBatch: (batchId: string) => AuditLog[]
  getAuditLogsByCandidate: (candidateId: string) => AuditLog[]
  getReagentBatch: (id: string) => ReagentBatch | undefined
  markAnomaly: (id: string, reason: string, operator: string) => void
  approveAnomaly: (id: string, reason: string, operator: string) => void
  modifyOpinion: (id: string, newOpinion: string, reason: string, operator: string) => void
  exportCSV: () => string
  exportJSON: () => string
}

const defaultFilters: FilterState = {
  batchNo: '',
  dateRange: null,
  status: '',
  negControlResult: '',
  search: '',
}

export const useOffTargetStore = create<OffTargetStore>()(
  persist(
    (set, get) => ({
      candidates: [],
      auditLogs: [],
      reagentBatches: [],
      filters: { ...defaultFilters },
      initialized: false,

      initialize: () => {
        const state = get()
        if (!state.initialized) {
          set({
            candidates: sampleCandidates,
            auditLogs: sampleAuditLogs,
            reagentBatches: sampleReagentBatches,
            initialized: true,
          })
        }
      },

      setFilters: (filters) => {
        set((state) => ({ filters: { ...state.filters, ...filters } }))
      },

      resetFilters: () => {
        set({ filters: { ...defaultFilters } })
      },

      getFilteredCandidates: () => {
        const { candidates, filters, reagentBatches } = get()
        return candidates.filter((c) => {
          if (filters.batchNo) {
            const batch = reagentBatches.find((b) => b.id === c.reagentBatchId)
            if (!batch || !batch.batchNo.includes(filters.batchNo)) return false
          }
          if (filters.status && c.status !== filters.status) return false
          if (filters.negControlResult && c.negControlResult !== filters.negControlResult) return false
          if (filters.search) {
            const q = filters.search.toLowerCase()
            const match =
              c.sampleId.toLowerCase().includes(q) ||
              c.targetSite.toLowerCase().includes(q) ||
              c.offTargetSite.toLowerCase().includes(q) ||
              c.processingOpinion.toLowerCase().includes(q)
            if (!match) return false
          }
          if (filters.dateRange) {
            const d = c.createdAt.slice(0, 10)
            if (d < filters.dateRange[0] || d > filters.dateRange[1]) return false
          }
          return true
        })
      },

      getCandidatesByBatch: (batchId) => {
        return get().candidates.filter((c) => c.reagentBatchId === batchId)
      },

      getAuditLogsByBatch: (batchId) => {
        return get().auditLogs.filter((a) => a.reagentBatchId === batchId)
      },

      getAuditLogsByCandidate: (candidateId) => {
        return get().auditLogs.filter((a) => a.candidateId === candidateId)
      },

      getReagentBatch: (id) => {
        return get().reagentBatches.find((b) => b.id === id)
      },

      markAnomaly: (id, reason, operator) => {
        const now = new Date().toISOString()
        set((state) => {
          const candidate = state.candidates.find((c) => c.id === id)
          if (!candidate || candidate.status === 'anomaly') return state
          const newLog: AuditLog = {
            id: `al-${Date.now()}`,
            candidateId: id,
            reagentBatchId: candidate.reagentBatchId,
            operator,
            operatedAt: now,
            action: 'mark_anomaly',
            oldValue: `status: ${candidate.status}`,
            newValue: 'status: anomaly',
            reason,
          }
          return {
            candidates: state.candidates.map((c) =>
              c.id === id ? { ...c, status: 'anomaly' as const, updatedAt: now } : c
            ),
            auditLogs: [newLog, ...state.auditLogs],
          }
        })
      },

      approveAnomaly: (id, reason, operator) => {
        const now = new Date().toISOString()
        set((state) => {
          const candidate = state.candidates.find((c) => c.id === id)
          if (!candidate || candidate.status !== 'anomaly') return state
          const newLog: AuditLog = {
            id: `al-${Date.now()}`,
            candidateId: id,
            reagentBatchId: candidate.reagentBatchId,
            operator,
            operatedAt: now,
            action: 'approve_anomaly',
            oldValue: 'status: anomaly',
            newValue: 'status: approved',
            reason,
          }
          return {
            candidates: state.candidates.map((c) =>
              c.id === id ? { ...c, status: 'approved' as const, updatedAt: now } : c
            ),
            auditLogs: [newLog, ...state.auditLogs],
          }
        })
      },

      modifyOpinion: (id, newOpinion, reason, operator) => {
        const now = new Date().toISOString()
        set((state) => {
          const candidate = state.candidates.find((c) => c.id === id)
          if (!candidate) return state
          const newLog: AuditLog = {
            id: `al-${Date.now()}`,
            candidateId: id,
            reagentBatchId: candidate.reagentBatchId,
            operator,
            operatedAt: now,
            action: 'modify_opinion',
            oldValue: candidate.processingOpinion,
            newValue: newOpinion,
            reason,
          }
          return {
            candidates: state.candidates.map((c) =>
              c.id === id ? { ...c, processingOpinion: newOpinion, updatedAt: now } : c
            ),
            auditLogs: [newLog, ...state.auditLogs],
          }
        })
      },

      exportCSV: () => {
        const { candidates, reagentBatches } = get()
        const filtered = get().getFilteredCandidates()
        const header = 'ID,样本ID,靶点位置,脱靶位点,错配数,正负链,试剂批号,阴性对照,状态,处理意见,创建时间,更新时间'
        const rows = filtered.map((c) => {
          const batch = reagentBatches.find((b) => b.id === c.reagentBatchId)
          return [
            c.id, c.sampleId, c.targetSite, c.offTargetSite, c.mismatchCount, c.strand,
            batch?.batchNo || '', c.negControlResult, c.status,
            `"${c.processingOpinion}"`, c.createdAt, c.updatedAt
          ].join(',')
        })
        return [header, ...rows].join('\n')
      },

      exportJSON: () => {
        const filtered = get().getFilteredCandidates()
        const { reagentBatches } = get()
        const data = filtered.map((c) => {
          const batch = reagentBatches.find((b) => b.id === c.reagentBatchId)
          return { ...c, reagentBatchNo: batch?.batchNo || '', reagentName: batch?.reagentName || '' }
        })
        return JSON.stringify(data, null, 2)
      },
    }),
    {
      name: 'crispr-offtarget-store',
    }
  )
)
