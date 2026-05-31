import { create } from 'zustand'
import type { Warning, Supplier, Contract, History } from './types'
import { api } from './api'

interface AppState {
  warnings: Warning[]
  suppliers: Supplier[]
  contracts: Contract[]
  histories: History[]
  loading: boolean
  error: string | null

  fetchWarnings: (params?: { supplierId?: string; status?: string; level?: string }) => Promise<void>
  confirmWarning: (id: string, confirmedBy: string) => Promise<void>
  updateWarningRemark: (id: string, remark: string, modifiedBy: string) => Promise<void>
  fetchSuppliers: (keyword?: string) => Promise<void>
  fetchContracts: (supplierId?: string) => Promise<void>
  extendContract: (id: string, extendDays: number, reason: string, operator: string) => Promise<boolean>
  updateContractQuota: (id: string, newAmount: number, reason: string, operator: string) => Promise<void>
  fetchHistories: (params?: { targetType?: string; targetId?: string; actionType?: string }) => Promise<void>
  clearError: () => void
}

export const useStore = create<AppState>((set, get) => ({
  warnings: [],
  suppliers: [],
  contracts: [],
  histories: [],
  loading: false,
  error: null,

  fetchWarnings: async (params) => {
    set({ loading: true, error: null })
    try {
      const warnings = await api.warnings.list(params)
      set({ warnings, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  confirmWarning: async (id, confirmedBy) => {
    try {
      const updated = await api.warnings.confirm(id, confirmedBy)
      set((state) => ({
        warnings: state.warnings.map((w) => (w.id === id ? updated : w)),
      }))
    } catch (e: any) {
      set({ error: e.message })
    }
  },

  updateWarningRemark: async (id, remark, modifiedBy) => {
    try {
      const updated = await api.warnings.updateRemark(id, remark, modifiedBy)
      set((state) => ({
        warnings: state.warnings.map((w) => (w.id === id ? updated : w)),
      }))
    } catch (e: any) {
      set({ error: e.message })
    }
  },

  fetchSuppliers: async (keyword) => {
    set({ loading: true, error: null })
    try {
      const suppliers = await api.suppliers.list(keyword)
      set({ suppliers, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  fetchContracts: async (supplierId) => {
    set({ loading: true, error: null })
    try {
      const contracts = await api.contracts.list(supplierId)
      set({ contracts, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  extendContract: async (id, extendDays, reason, operator) => {
    try {
      const updated = await api.contracts.extend(id, extendDays, reason, operator)
      set((state) => ({
        contracts: state.contracts.map((c) => (c.id === id ? updated : c)),
      }))
      return true
    } catch (e: any) {
      set({ error: e.message })
      return false
    }
  },

  updateContractQuota: async (id, newAmount, reason, operator) => {
    try {
      const updated = await api.contracts.updateQuota(id, newAmount, reason, operator)
      set((state) => ({
        contracts: state.contracts.map((c) => (c.id === id ? updated : c)),
      }))
    } catch (e: any) {
      set({ error: e.message })
    }
  },

  fetchHistories: async (params) => {
    set({ loading: true, error: null })
    try {
      const histories = await api.histories.list(params)
      set({ histories, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  clearError: () => set({ error: null }),
}))
