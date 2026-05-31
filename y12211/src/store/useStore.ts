import { create } from 'zustand'
import type {
  TicketOrder,
  DerivativeSale,
  SplitRule,
  SplitResult,
  ExceptionItem,
  DashboardStats,
  CreateOrderData,
  CreateDerivativeData,
  ResolveExceptionData,
} from '../../shared/types'

interface AppState {
  orders: TicketOrder[]
  ordersTotal: number
  derivatives: DerivativeSale[]
  rules: SplitRule[]
  exceptions: ExceptionItem[]
  splitResults: any[]
  dashboardStats: DashboardStats | null
  loading: boolean
  error: string | null

  fetchOrders: (filters?: any) => Promise<void>
  fetchOrder: (id: string) => Promise<TicketOrder | null>
  createOrder: (data: CreateOrderData) => Promise<TicketOrder>
  processSplit: (orderId: string, ruleId?: string) => Promise<any>

  fetchDerivatives: (filters?: any) => Promise<void>
  createDerivative: (data: CreateDerivativeData) => Promise<DerivativeSale>

  fetchRules: () => Promise<void>
  fetchRuleVersions: (ruleId: string) => Promise<any[]>

  fetchExceptions: (filters?: any) => Promise<void>
  resolveException: (id: string, data: ResolveExceptionData) => Promise<ExceptionItem>

  fetchDashboardStats: () => Promise<void>
  fetchSplitResults: () => Promise<void>

  traceForward: (orderId: string) => Promise<any>
  traceBackward: (resultId: string) => Promise<any>
}

const API_BASE = '/api'

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API Error: ${res.status}`)
  return res.json()
}

export const useStore = create<AppState>((set) => ({
  orders: [],
  ordersTotal: 0,
  derivatives: [],
  rules: [],
  exceptions: [],
  splitResults: [],
  dashboardStats: null,
  loading: false,
  error: null,

  fetchOrders: async (filters?) => {
    set({ loading: true })
    try {
      const params = new URLSearchParams(filters).toString()
      const data = await apiFetch<any>(`/orders?${params}`)
      set({ orders: data.list, ordersTotal: data.total, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  fetchOrder: async (id: string) => {
    set({ loading: true })
    try {
      const order = await apiFetch<TicketOrder>(`/orders/${id}`)
      set({ loading: false })
      return order
    } catch (error: any) {
      set({ error: error.message, loading: false })
      return null
    }
  },

  createOrder: async (data: CreateOrderData) => {
    set({ loading: true })
    const order = await apiFetch<TicketOrder>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    set({ loading: false })
    return order
  },

  processSplit: async (orderId: string, ruleId?: string) => {
    set({ loading: true })
    const result = await apiFetch(`/orders/${orderId}/split`, {
      method: 'POST',
      body: JSON.stringify({ ruleId }),
    })
    set({ loading: false })
    return result
  },

  fetchDerivatives: async (filters?) => {
    set({ loading: true })
    try {
      const params = new URLSearchParams(filters).toString()
      const data = await apiFetch<any>(`/derivatives?${params}`)
      set({ derivatives: data.list, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  createDerivative: async (data: CreateDerivativeData) => {
    set({ loading: true })
    const derivative = await apiFetch<DerivativeSale>('/derivatives', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    set({ loading: false })
    return derivative
  },

  fetchRules: async () => {
    set({ loading: true })
    try {
      const rules = await apiFetch<SplitRule[]>('/rules')
      set({ rules, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  fetchRuleVersions: async (ruleId: string) => {
    set({ loading: true })
    const versions = await apiFetch<any[]>(`/rules/${ruleId}/versions`)
    set({ loading: false })
    return versions
  },

  fetchExceptions: async (filters?) => {
    set({ loading: true })
    try {
      const params = new URLSearchParams(filters).toString()
      const exceptions = await apiFetch<ExceptionItem[]>(`/exceptions?${params}`)
      set({ exceptions, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  resolveException: async (id: string, data: ResolveExceptionData) => {
    set({ loading: true })
    const exception = await apiFetch<ExceptionItem>(`/exceptions/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    set({ loading: false })
    return exception
  },

  fetchDashboardStats: async () => {
    set({ loading: true })
    try {
      const stats = await apiFetch<DashboardStats>('/revenue/dashboard')
      set({ dashboardStats: stats, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  fetchSplitResults: async () => {
    set({ loading: true })
    try {
      const data = await apiFetch<any>('/revenue/results')
      set({ splitResults: data.list, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  traceForward: async (orderId: string) => {
    set({ loading: true })
    const data = await apiFetch(`/revenue/trace/forward/${orderId}`)
    set({ loading: false })
    return data
  },

  traceBackward: async (resultId: string) => {
    set({ loading: true })
    const data = await apiFetch(`/revenue/trace/backward/${resultId}`)
    set({ loading: false })
    return data
  },
}))
