import { create } from 'zustand'

interface Work {
  id: string
  title: string
  lyricist: string
  composer: string
  isrc: string
  platforms: string[]
  totalRoyalty: number
  status: 'normal' | 'anomaly'
  lastCorrection?: string
  registeredDate?: string
}

interface WorkDetail extends Work {
  usageRecords: UsageRecord[]
  royaltyChain: RoyaltyStep[]
  proportionVersions: ProportionVersion[]
  corrections: Correction[]
  appeals: Appeal[]
}

interface UsageRecord {
  id: string
  platform: string
  usageCount: number
  period: string
  amount: number
}

interface RoyaltyStep {
  step: string
  label: string
  value: string
  description: string
}

interface ProportionVersion {
  id: string
  version: string
  date: string
  proportions: { name: string; share: number }[]
  note?: string
}

type CorrectionType = 'under_report' | 'proportion_change' | 'duplicate_use'

interface Correction {
  id: string
  workId: string
  workTitle: string
  type: CorrectionType | '漏报' | '比例变更' | '重复使用'
  before: string
  after: string
  explanation: string
  operator: string
  date: string
}

interface Appeal {
  id: string
  workId: string
  workTitle: string
  status: 'pending' | 'platform_replied' | 'confirmed'
  platformReply?: string
  result?: string
  explanation: string
  date: string
}

interface OverviewData {
  totalRoyalty: number
  anomalyCount: number
  periodComparison: { current: number; previous: number; change: number }
  platformBreakdown: { platform: string; amount: number; change: number }[]
  anomalySummary: { type: string; count: number }[]
  recentAnomalies: { id: string; workTitle: string; type: string; date: string }[]
}

interface ImportState {
  uploading: boolean
  importId: string | null
  preview: { original: any[]; processed: any[] } | null
  issues: { row: number; type: string; message: string }[]
}

interface Report {
  id: string
  type: string
  title: string
  createdAt: string
  downloadUrl: string
}

interface StoreState {
  works: Work[]
  worksLoading: boolean
  worksError: string | null
  currentWork: WorkDetail | null
  workLoading: boolean
  workError: string | null
  overview: OverviewData | null
  overviewLoading: boolean
  overviewError: string | null
  corrections: Correction[]
  correctionsLoading: boolean
  appeals: Appeal[]
  appealsLoading: boolean
  importState: ImportState
  reports: Report[]
  reportsLoading: boolean
  sidebarCollapsed: boolean
  currentPage: string
  worksPagination: { page: number; pageSize: number; total: number }

  setSidebarCollapsed: (collapsed: boolean) => void
  setCurrentPage: (page: string) => void
  fetchOverview: () => Promise<void>
  fetchWorks: (params?: { keyword?: string; platform?: string; status?: string; page?: number; pageSize?: number }) => Promise<void>
  fetchWorkDetail: (id: string) => Promise<void>
  fetchCorrections: () => Promise<void>
  fetchAppeals: () => Promise<void>
  uploadFile: (file: File, fileType: string) => Promise<void>
  clearImport: () => void
  confirmImport: () => Promise<void>
  fetchReports: () => Promise<void>
  generateReport: (params: { type: string; works: string[]; period: string; includeAnomaly: boolean; includeTrace: boolean }) => Promise<void>
  createCorrection: (data: Partial<Correction>) => Promise<void>
  createAppeal: (data: Partial<Appeal> & { workId: string; correctionId: string }) => Promise<void>
  updateAppealStatus: (id: string, status: Appeal['status'], extras?: { platformReply?: string; result?: string }) => Promise<void>
}

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }
  const json = await res.json()
  return json.data as T
}

export const useStore = create<StoreState>((set, get) => ({
  works: [],
  worksLoading: false,
  worksError: null,
  currentWork: null,
  workLoading: false,
  workError: null,
  overview: null,
  overviewLoading: false,
  overviewError: null,
  corrections: [],
  correctionsLoading: false,
  appeals: [],
  appealsLoading: false,
  importState: { uploading: false, importId: null, preview: null, issues: [] },
  reports: [],
  reportsLoading: false,
  sidebarCollapsed: false,
  currentPage: 'overview',
  worksPagination: { page: 1, pageSize: 10, total: 0 },

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setCurrentPage: (page) => set({ currentPage: page }),

  fetchOverview: async () => {
    set({ overviewLoading: true, overviewError: null })
    try {
      const data = await api<OverviewData>('/api/overview')
      set({ overview: data, overviewLoading: false })
    } catch (e: any) {
      set({ overviewError: e.message, overviewLoading: false })
    }
  },

  fetchWorks: async (params) => {
    set({ worksLoading: true, worksError: null })
    try {
      const sp = new URLSearchParams()
      if (params?.keyword) sp.set('keyword', params.keyword)
      if (params?.platform) sp.set('platform', params.platform)
      if (params?.status) sp.set('status', params.status)
      if (params?.page) sp.set('page', String(params.page))
      if (params?.pageSize) sp.set('pageSize', String(params.pageSize))
      const qs = sp.toString()
      const data = await api<{ items: Work[]; total: number }>(`/api/works${qs ? '?' + qs : ''}`)
      set({
        works: data.items,
        worksLoading: false,
        worksPagination: { page: params?.page || 1, pageSize: params?.pageSize || 10, total: data.total },
      })
    } catch (e: any) {
      set({ worksError: e.message, worksLoading: false })
    }
  },

  fetchWorkDetail: async (id) => {
    set({ workLoading: true, workError: null })
    try {
      const data = await api<WorkDetail>(`/api/works/${id}`)
      set({ currentWork: data, workLoading: false })
    } catch (e: any) {
      set({ workError: e.message, workLoading: false })
    }
  },

  fetchCorrections: async () => {
    set({ correctionsLoading: true })
    try {
      const data = await api<Correction[]>('/api/corrections')
      set({ corrections: data, correctionsLoading: false })
    } catch {
      set({ correctionsLoading: false })
    }
  },

  fetchAppeals: async () => {
    set({ appealsLoading: true })
    try {
      const data = await api<Appeal[]>('/api/appeals')
      set({ appeals: data, appealsLoading: false })
    } catch {
      set({ appealsLoading: false })
    }
  },

  uploadFile: async (file, fileType) => {
    set({ importState: { ...get().importState, uploading: true } })
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('fileType', fileType)
      const data = await api<{ importId: string; original: any[]; processed: any[]; issues: { row: number; type: string; message: string }[] }>('/api/import/upload', {
        method: 'POST',
        body: form,
      })
      set({
        importState: {
          uploading: false,
          importId: data.importId,
          preview: { original: data.original, processed: data.processed },
          issues: data.issues,
        },
      })
    } catch {
      set({ importState: { ...get().importState, uploading: false } })
    }
  },

  clearImport: () => set({ importState: { uploading: false, importId: null, preview: null, issues: [] } }),

  confirmImport: async () => {
    try {
      const { importId } = get().importState
      if (!importId) throw new Error('没有导入ID')
      await api(`/api/import/${importId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importId }),
      })
      set({ importState: { uploading: false, importId: null, preview: null, issues: [] } })
    } catch {}
  },

  fetchReports: async () => {
    set({ reportsLoading: true })
    try {
      const data = await api<Report[]>('/api/reports')
      set({ reports: data, reportsLoading: false })
    } catch {
      set({ reportsLoading: false })
    }
  },

  generateReport: async (params) => {
    try {
      await api('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: params.type,
          works: params.works,
          period: params.period,
          includeAnomaly: params.includeAnomaly,
          includeTrace: params.includeTrace,
        }),
      })
      get().fetchReports()
    } catch (e: any) {
      console.error('generateReport error:', e.message)
      throw e
    }
  },

  createCorrection: async (data) => {
    try {
      const res = await api<Correction>('/api/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workId: data.workId,
          type: data.type,
          before: data.before,
          after: data.after,
          explanation: data.explanation,
        }),
      })
      get().fetchCorrections()
      const { currentWork } = get()
      if (currentWork && currentWork.id === data.workId) {
        set({
          currentWork: {
            ...currentWork,
            corrections: [res, ...currentWork.corrections],
            status: 'anomaly',
          },
        })
      }
    } catch (e: any) {
      console.error('createCorrection error:', e.message)
      throw e
    }
  },

  createAppeal: async (data) => {
    try {
      const res = await api<Appeal>('/api/appeals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workId: data.workId,
          correctionId: data.correctionId,
          explanation: data.explanation,
        }),
      })
      get().fetchAppeals()
      const { currentWork } = get()
      if (currentWork && currentWork.id === data.workId) {
        set({
          currentWork: {
            ...currentWork,
            appeals: [res, ...currentWork.appeals],
          },
        })
      }
    } catch (e: any) {
      console.error('createAppeal error:', e.message)
      throw e
    }
  },

  updateAppealStatus: async (id, status, extras) => {
    try {
      const res = await api<Appeal>(`/api/appeals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          platformReply: extras?.platformReply,
          result: extras?.result,
        }),
      })
      get().fetchAppeals()
      const { currentWork } = get()
      if (currentWork) {
        set({
          currentWork: {
            ...currentWork,
            appeals: currentWork.appeals.map((a) => (a.id === id ? res : a)),
          },
        })
      }
    } catch (e: any) {
      console.error('updateAppealStatus error:', e.message)
      throw e
    }
  },
}))

export type { Work, WorkDetail, Correction, Appeal, OverviewData, Report, RoyaltyStep, ProportionVersion, UsageRecord }
