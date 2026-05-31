import { create } from 'zustand'
import type { ExpenditureApplication, Invoice, ApprovalRecord, ResidentOpinion, ProjectDelay, DisclosureRecord, AuditLog, DashboardData, TraceChain } from '../../shared/types'

interface AppState {
  dashboard: DashboardData | null
  expenditures: ExpenditureApplication[]
  invoices: Invoice[]
  approvals: ApprovalRecord[]
  opinions: ResidentOpinion[]
  delays: ProjectDelay[]
  disclosures: DisclosureRecord[]
  auditLogs: AuditLog[]
  currentTrace: TraceChain | null
  loading: boolean
  error: string | null
  
  fetchDashboard: () => Promise<void>
  fetchExpenditures: () => Promise<void>
  fetchInvoices: () => Promise<void>
  fetchApprovals: () => Promise<void>
  fetchDisclosures: () => Promise<void>
  fetchAuditLogs: () => Promise<void>
  fetchTrace: (id: string) => Promise<void>
  
  createExpenditure: (data: any) => Promise<ExpenditureApplication>
  createInvoice: (data: any) => Promise<Invoice>
  confirmDuplicate: (id: string, status: string, duplicate_of?: string) => Promise<void>
  verifyInvoice: (id: string, status: string) => Promise<void>
  updateApproval: (id: string, data: any) => Promise<void>
  createDelay: (data: any) => Promise<void>
  createDisclosure: (data: any) => Promise<void>
  updateDisclosureStatus: (id: string, status: string) => Promise<void>
  generateReport: (data: any) => Promise<any>
  resetDatabase: () => Promise<void>
}

const API_BASE = '/api'

async function apiGet(endpoint: string) {
  const res = await fetch(`${API_BASE}${endpoint}`)
  const data = await res.json()
  if (!res.ok || !data.success) throw new Error(data.error || '请求失败')
  return data.data
}

async function apiPost(endpoint: string, body: any) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (!res.ok || !data.success) throw new Error(data.error || '请求失败')
  return data.data
}

async function apiPatch(endpoint: string, body: any) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (!res.ok || !data.success) throw new Error(data.error || '请求失败')
  return data.data
}

export const useAppStore = create<AppState>((set, get) => ({
  dashboard: null,
  expenditures: [],
  invoices: [],
  approvals: [],
  opinions: [],
  delays: [],
  disclosures: [],
  auditLogs: [],
  currentTrace: null,
  loading: false,
  error: null,

  fetchDashboard: async () => {
    set({ loading: true, error: null })
    try {
      const data = await apiGet('/dashboard')
      set({ dashboard: data, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  fetchExpenditures: async () => {
    set({ loading: true, error: null })
    try {
      const data = await apiGet('/expenditures')
      set({ expenditures: data, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  fetchInvoices: async () => {
    set({ loading: true, error: null })
    try {
      const data = await apiGet('/invoices')
      set({ invoices: data, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  fetchApprovals: async () => {
    set({ loading: true, error: null })
    try {
      const data = await apiGet('/approvals')
      set({ approvals: data, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  fetchDisclosures: async () => {
    set({ loading: true, error: null })
    try {
      const data = await apiGet('/disclosures')
      set({ disclosures: data, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  fetchAuditLogs: async () => {
    set({ loading: true, error: null })
    try {
      const data = await apiGet('/audit-logs?limit=50')
      set({ auditLogs: data, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  fetchTrace: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const data = await apiGet(`/trace/${id}`)
      set({ currentTrace: data, loading: false })
    } catch (e: any) {
      set({ error: e.message, loading: false })
    }
  },

  createExpenditure: async (data) => {
    const result = await apiPost('/expenditures', { ...data, operator: '财务人员' })
    await get().fetchExpenditures()
    return result
  },

  createInvoice: async (data) => {
    const result = await apiPost('/invoices', { ...data, operator: '财务人员' })
    await get().fetchInvoices()
    return result
  },

  confirmDuplicate: async (id, status, duplicate_of) => {
    await apiPatch(`/invoices/${id}/duplicate`, { status, duplicate_of, operator: '财务人员' })
    await get().fetchInvoices()
    await get().fetchDashboard()
  },

  verifyInvoice: async (id, status) => {
    await apiPatch(`/invoices/${id}/verify`, { status, operator: '财务人员' })
    await get().fetchInvoices()
  },

  updateApproval: async (id, data) => {
    await apiPatch(`/approvals/${id}`, { ...data, operator: '审批人员' })
    await get().fetchApprovals()
    await get().fetchDashboard()
  },

  createDelay: async (data) => {
    await apiPost('/delays', { ...data, operator: '财务人员' })
    await get().fetchDashboard()
  },

  createDisclosure: async (data) => {
    const result = await apiPost('/disclosures', { ...data, operator: '财务人员' })
    await get().fetchDisclosures()
    return result
  },

  updateDisclosureStatus: async (id, status) => {
    await apiPatch(`/disclosures/${id}/status`, { status, operator: '财务人员' })
    await get().fetchDisclosures()
  },

  generateReport: async (data) => {
    return await apiPost('/reports/generate', { ...data, operator: '财务人员' })
  },

  resetDatabase: async () => {
    await apiGet('/db/reset')
    await get().fetchDashboard()
    await get().fetchExpenditures()
    await get().fetchInvoices()
    await get().fetchApprovals()
    await get().fetchDisclosures()
    await get().fetchAuditLogs()
  }
}))
