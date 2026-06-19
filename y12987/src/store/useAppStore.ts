import { create } from 'zustand'

interface TaskNode {
  id: string
  name: string
  status: 'success' | 'failed' | 'running' | 'pending'
  upstream: string[]
  downstream: string[]
  workorderId: string | null
  lastRunAt: string
}

interface Workorder {
  id: string
  title: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  taskId: string
  conclusion: string
  createdAt: string
  createdBy: string
  changeCount: number
}

interface WorkorderVersion {
  id: string
  workorderId: string
  conclusion: string
  changedBy: string
  changedAt: string
  changeReason: string
  version: number
}

interface AuditLog {
  id: string
  actionType: string
  entityType: string
  entityId: string
  operator: string
  operatedAt: string
  reason: string
  snapshot: string
}

interface AppStore {
  tasks: TaskNode[]
  workorders: Workorder[]
  workorderTotal: number
  workorderVersions: WorkorderVersion[]
  auditLogs: AuditLog[]
  auditTotal: number
  selectedTaskId: string | null
  sidebarCollapsed: boolean

  fetchTasks: () => Promise<void>
  fetchWorkorders: (page?: number, pageSize?: number, status?: string) => Promise<void>
  fetchWorkorderVersions: (id: string) => Promise<void>
  fetchAuditLogs: (params?: Record<string, string>) => Promise<void>
  setSelectedTaskId: (id: string | null) => void
  toggleSidebar: () => void
  createWorkorder: (data: { title: string; taskId: string; createdBy: string; conclusion: string }) => Promise<void>
  updateWorkorder: (id: string, data: { changeReason: string; conclusion?: string; status?: string }) => Promise<void>
}

export const useAppStore = create<AppStore>((set, get) => ({
  tasks: [],
  workorders: [],
  workorderTotal: 0,
  workorderVersions: [],
  auditLogs: [],
  auditTotal: 0,
  selectedTaskId: null,
  sidebarCollapsed: false,

  fetchTasks: async () => {
    const res = await fetch('/api/tasks')
    const json = await res.json()
    set({ tasks: json.data })
  },

  fetchWorkorders: async (page = 1, pageSize = 20, status?: string) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (status) params.set('status', status)
    const res = await fetch(`/api/workorders?${params}`)
    const json = await res.json()
    set({ workorders: json.data.list, workorderTotal: json.data.total })
  },

  fetchWorkorderVersions: async (id: string) => {
    const res = await fetch(`/api/workorders/${id}/versions`)
    const json = await res.json()
    set({ workorderVersions: json.data })
  },

  fetchAuditLogs: async (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    const res = await fetch(`/api/audit-logs${qs}`)
    const json = await res.json()
    set({ auditLogs: json.data.list, auditTotal: json.data.total })
  },

  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  createWorkorder: async (data) => {
    await fetch('/api/workorders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    await get().fetchWorkorders()
  },

  updateWorkorder: async (id, data) => {
    await fetch(`/api/workorders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    await get().fetchWorkorders()
  },
}))
