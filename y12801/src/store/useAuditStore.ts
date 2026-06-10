import { create } from 'zustand'
import type { AuditLog } from '@/types'
import { createAuditLog } from '@/utils/auditLogger'
import { mockAuditLogs } from '@/data/mockData'

interface AuditState {
  auditLogs: AuditLog[]
  filterOperator: string
  filterBatchId: string
  filterDateRange: [string, string] | null

  addAuditLog: (params: {
    entityType: AuditLog['entityType']
    entityId: string
    action: string
    operator: string
    detail: string
    beforeData?: Record<string, unknown> | null
    afterData?: Record<string, unknown> | null
  }) => void
  setFilterOperator: (operator: string) => void
  setFilterBatchId: (batchId: string) => void
  setFilterDateRange: (range: [string, string] | null) => void
  getFilteredLogs: () => AuditLog[]
}

export const useAuditStore = create<AuditState>((set, get) => ({
  auditLogs: mockAuditLogs,
  filterOperator: '',
  filterBatchId: '',
  filterDateRange: null,

  addAuditLog: (params) =>
    set((state) => ({
      auditLogs: [...state.auditLogs, createAuditLog(params)],
    })),

  setFilterOperator: (operator) => set({ filterOperator: operator }),

  setFilterBatchId: (batchId) => set({ filterBatchId: batchId }),

  setFilterDateRange: (range) => set({ filterDateRange: range }),

  getFilteredLogs: () => {
    const { auditLogs, filterOperator, filterBatchId, filterDateRange } = get()
    return auditLogs.filter((log) => {
      if (filterOperator && log.operator !== filterOperator) return false
      if (filterBatchId && log.entityId !== filterBatchId && !log.detail.includes(filterBatchId)) return false
      if (filterDateRange) {
        const logDate = new Date(log.operatedAt).getTime()
        const startDate = new Date(filterDateRange[0]).getTime()
        const endDate = new Date(filterDateRange[1]).getTime()
        if (logDate < startDate || logDate > endDate) return false
      }
      return true
    })
  },
}))
