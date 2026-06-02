import { create } from 'zustand'
import dayjs from 'dayjs'
import type {
  Registration,
  Material,
  Repertoire,
  Payment,
  Document,
  TeacherNote,
  HistoryRecord,
  Snapshot,
  FilterOptions,
} from '@/types'
import { dataService } from '@/services/DataService'

interface AppState {
  registrations: Registration[]
  currentRegistration: Registration | null
  currentMaterials: Material[]
  currentRepertoires: Repertoire[]
  currentPayment: Payment | null
  currentDocuments: Document[]
  currentTeacherNotes: TeacherNote[]
  currentHistory: HistoryRecord[]
  currentSnapshots: Snapshot[]
  filters: FilterOptions
  loading: boolean
  error: string | null
  stats: {
    total: number
    passed: number
    pending: number
    hasAnomalies: number
    anomalyStats: Record<string, number>
  } | null

  loadRegistrations: () => Promise<void>
  loadRegistrationDetail: (id: string) => Promise<void>
  setFilters: (filters: Partial<FilterOptions>) => void
  updateRegistration: (
    id: string,
    data: Partial<Registration>,
    operator: string,
    reason: string
  ) => Promise<void>
  addTeacherNote: (
    registrationId: string,
    note: Omit<TeacherNote, 'id' | 'registrationId' | 'createdAt'>
  ) => Promise<void>
  exportToExcel: (ids?: string[]) => Promise<void>
  exportAnomalyReport: () => Promise<void>
  exportAllData: () => Promise<void>
  importAllData: (file: File) => Promise<void>
  generateAuditReport: (id: string) => Promise<{ html: string; plainText: string; title: string }>
  loadStats: () => Promise<void>
  clearCurrent: () => void
  setError: (error: string | null) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  registrations: [],
  currentRegistration: null,
  currentMaterials: [],
  currentRepertoires: [],
  currentPayment: null,
  currentDocuments: [],
  currentTeacherNotes: [],
  currentHistory: [],
  currentSnapshots: [],
  filters: {},
  loading: false,
  error: null,
  stats: null,

  loadRegistrations: async () => {
    set({ loading: true, error: null })
    try {
      const filters = get().filters
      const registrations = await dataService.getRegistrations(filters)
      set({ registrations, loading: false })
    } catch (err) {
      set({ error: '加载报名列表失败', loading: false })
      console.error(err)
    }
  },

  loadRegistrationDetail: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const [
        registration,
        materials,
        repertoires,
        payment,
        documents,
        teacherNotes,
        history,
        snapshots,
      ] = await Promise.all([
        dataService.getRegistration(id),
        dataService.getMaterials(id),
        dataService.getRepertoires(id),
        dataService.getPayment(id),
        dataService.getDocuments(id),
        dataService.getTeacherNotes(id),
        dataService.getHistory(id),
        dataService.getSnapshots(id),
      ])

      set({
        currentRegistration: registration,
        currentMaterials: materials,
        currentRepertoires: repertoires,
        currentPayment: payment,
        currentDocuments: documents,
        currentTeacherNotes: teacherNotes,
        currentHistory: history,
        currentSnapshots: snapshots,
        loading: false,
      })
    } catch (err) {
      set({ error: '加载详情失败', loading: false })
      console.error(err)
    }
  },

  setFilters: (filters: Partial<FilterOptions>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }))
  },

  updateRegistration: async (
    id: string,
    data: Partial<Registration>,
    operator: string,
    reason: string
  ) => {
    set({ loading: true, error: null })
    try {
      await dataService.updateRegistration(id, data, operator, reason)
      await get().loadRegistrations()
      await get().loadRegistrationDetail(id)
    } catch (err) {
      set({ error: '更新失败', loading: false })
      console.error(err)
    }
  },

  addTeacherNote: async (
    registrationId: string,
    note: Omit<TeacherNote, 'id' | 'registrationId' | 'createdAt'>
  ) => {
    set({ loading: true, error: null })
    try {
      await dataService.addTeacherNote(registrationId, note)
      await get().loadRegistrationDetail(registrationId)
    } catch (err) {
      set({ error: '添加备注失败', loading: false })
      console.error(err)
    }
  },

  exportToExcel: async (ids?: string[]) => {
    set({ loading: true, error: null })
    try {
      const blob = await dataService.exportToExcel(ids)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `报名列表_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      set({ loading: false })
    } catch (err) {
      set({ error: '导出失败', loading: false })
      console.error(err)
    }
  },

  exportAnomalyReport: async () => {
    set({ loading: true, error: null })
    try {
      const filters = get().filters
      const blob = await dataService.exportAnomalyReport(filters)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `异常报告_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      set({ loading: false })
    } catch (err) {
      set({ error: '导出异常报告失败', loading: false })
      console.error(err)
    }
  },

  generateAuditReport: async (id: string) => {
    return dataService.generateAuditReport(id)
  },

  exportAllData: async () => {
    set({ loading: true, error: null })
    try {
      const data = await dataService.exportAllData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `备份数据_${dayjs().format('YYYYMMDD_HHmm')}.json`
      a.click()
      URL.revokeObjectURL(url)
      set({ loading: false })
    } catch (err) {
      set({ error: '导出失败', loading: false })
      console.error(err)
    }
  },

  importAllData: async (file: File) => {
    set({ loading: true, error: null })
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      await dataService.importAllData(data)
      await get().loadRegistrations()
      await get().loadStats()
      set({ loading: false })
    } catch (err) {
      set({ error: '导入失败', loading: false })
      console.error(err)
    }
  },

  loadStats: async () => {
    try {
      const stats = await dataService.getStats()
      set({ stats })
    } catch (err) {
      console.error('加载统计数据失败', err)
    }
  },

  clearCurrent: () => {
    set({
      currentRegistration: null,
      currentMaterials: [],
      currentRepertoires: [],
      currentPayment: null,
      currentDocuments: [],
      currentTeacherNotes: [],
      currentHistory: [],
      currentSnapshots: [],
    })
  },

  setError: (error: string | null) => {
    set({ error })
  },
}))
