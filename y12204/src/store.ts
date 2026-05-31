import { create } from 'zustand'

export interface QueueItem {
  id: string
  bill_no: string
  drawer: string
  payee: string
  amount: number
  due_date: string
  issue_date: string
  acceptor: string
  status: string
  priority_score: number
  cash_plan_id: string | null
  event_id: string
  has_duplicate: number
  has_dispute: number
  created_by: string
  fund_lock: Record<string, unknown> | null
}

export interface EventItem {
  id: string
  event_no: string
  title: string
  anomaly_type: string | null
  status: string
  created_at: string
  updated_at: string
}

interface AppState {
  queueItems: QueueItem[]
  fetchQueue: () => Promise<void>
  selectedBillId: string | null
  setSelectedBill: (id: string | null) => void

  events: EventItem[]
  fetchEvents: () => Promise<void>
  selectedEventId: string | null
  setSelectedEvent: (id: string | null) => void

  searchQuery: string
  setSearchQuery: (query: string) => void

  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>((set) => ({
  queueItems: [],
  fetchQueue: async () => {
    const res = await fetch('/api/bills')
    const data = await res.json()
    set({ queueItems: data })
  },
  selectedBillId: null,
  setSelectedBill: (id) => set({ selectedBillId: id }),

  events: [],
  fetchEvents: async () => {
    const res = await fetch('/api/events')
    const data = await res.json()
    set({ events: data })
  },
  selectedEventId: null,
  setSelectedEvent: (id) => set({ selectedEventId: id }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}))
