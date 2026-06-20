import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  buildSummaryJson,
  buildChecklistJson,
  buildChecklistCsv,
} from '@/export'
import type {
  TimecodeEntry,
  RemarkSnapshot,
  ScreenshotSnapshot,
  HistoryEntry,
  FilterState,
} from '@/types'

const genId = () => crypto.randomUUID()
const now = () => new Date().toISOString()

function computeAuthStatus(endDate: string): TimecodeEntry['authorization']['status'] {
  const end = new Date(endDate)
  const today = new Date()
  const diffDays = (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  if (diffDays < 0) return 'expired'
  if (diffDays <= 7) return 'expiring'
  return 'valid'
}

const SEED_ENTRIES: TimecodeEntry[] = [
  {
    id: 'seed-1',
    projectName: '星河录音棚 A棚',
    timeRange: { start: '2026-06-10T09:00', end: '2026-06-10T18:00' },
    splitRatio: '甲方60% / 乙方40%',
    authorization: {
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'valid',
    },
    remarks: [
      { id: 'r-1', content: '乐队排练确认，周六全天', type: 'rehearsal', createdAt: '2026-06-08T10:00:00Z', version: 1 },
      { id: 'r-2', content: '授权书已归档', type: 'authorization', createdAt: '2026-06-09T14:00:00Z', version: 2 },
    ],
    screenshots: [],
    alignmentStatus: 'aligned',
    reviewStatus: 'confirmed',
    createdAt: '2026-06-08T10:00:00Z',
    updatedAt: '2026-06-09T14:00:00Z',
  },
  {
    id: 'seed-2',
    projectName: '星河录音棚 B棚',
    timeRange: { start: '2026-06-12T14:00', end: '2026-06-12T22:00' },
    splitRatio: '甲方50% / 乙方50%',
    authorization: {
      startDate: '2026-03-01',
      endDate: '2026-06-15',
      status: 'expiring',
      confirmReason: '授权将于3天后到期',
      nextStep: '联系甲方续签授权书',
    },
    remarks: [
      { id: 'r-3', content: '混音师临时加场，需确认授权续签', type: 'manual', createdAt: '2026-06-11T16:00:00Z', version: 1 },
    ],
    screenshots: [
      { id: 's-1', dataUrl: '', fileName: '排练群截图_0609.png', relatedRemarkId: 'r-3', createdAt: '2026-06-11T16:05:00Z', version: 1, isSupplementary: false },
    ],
    alignmentStatus: 'misaligned',
    reviewStatus: 'flagged',
    createdAt: '2026-06-11T15:00:00Z',
    updatedAt: '2026-06-11T16:05:00Z',
  },
  {
    id: 'seed-3',
    projectName: '回声工作室',
    timeRange: { start: '2026-06-14T10:00', end: '2026-06-14T20:00' },
    splitRatio: '甲方70% / 乙方30%',
    authorization: {
      startDate: '2025-06-01',
      endDate: '2026-06-01',
      status: 'expired',
      confirmReason: '授权已过期13天',
      nextStep: '紧急联系甲方补签或暂停使用',
    },
    remarks: [
      { id: 'r-4', content: '甲方未回复续签邮件', type: 'authorization', createdAt: '2026-06-05T09:00:00Z', version: 1 },
      { id: 'r-5', content: '电话催促后甲方表示下周处理', type: 'authorization', createdAt: '2026-06-10T11:00:00Z', version: 2 },
    ],
    screenshots: [],
    alignmentStatus: 'misaligned',
    reviewStatus: 'unreviewed',
    createdAt: '2026-06-05T09:00:00Z',
    updatedAt: '2026-06-10T11:00:00Z',
  },
]

const SEED_HISTORY: HistoryEntry[] = [
  {
    id: 'h-1',
    entryId: 'seed-2',
    snapshot: {
      remarks: [{ id: 'r-3', content: '混音师临时加场，需确认授权续签', type: 'manual', createdAt: '2026-06-11T16:00:00Z', version: 1 }],
      screenshots: [],
      alignmentStatus: 'pending',
      authorization: { startDate: '2026-03-01', endDate: '2026-06-15', status: 'expiring', confirmReason: '授权将于3天后到期', nextStep: '联系甲方续签授权书' },
    },
    trigger: 'remark_added',
    createdAt: '2026-06-11T16:00:00Z',
  },
  {
    id: 'h-2',
    entryId: 'seed-2',
    snapshot: {
      remarks: [{ id: 'r-3', content: '混音师临时加场，需确认授权续签', type: 'manual', createdAt: '2026-06-11T16:00:00Z', version: 1 }],
      screenshots: [{ id: 's-1', dataUrl: '', fileName: '排练群截图_0609.png', relatedRemarkId: 'r-3', createdAt: '2026-06-11T16:05:00Z', version: 1, isSupplementary: false }],
      alignmentStatus: 'misaligned',
      authorization: { startDate: '2026-03-01', endDate: '2026-06-15', status: 'expiring', confirmReason: '授权将于3天后到期', nextStep: '联系甲方续签授权书' },
    },
    trigger: 'screenshot_added',
    createdAt: '2026-06-11T16:05:00Z',
  },
  {
    id: 'h-3',
    entryId: 'seed-3',
    snapshot: {
      remarks: [{ id: 'r-4', content: '甲方未回复续签邮件', type: 'authorization', createdAt: '2026-06-05T09:00:00Z', version: 1 }],
      screenshots: [],
      alignmentStatus: 'misaligned',
      authorization: { startDate: '2025-06-01', endDate: '2026-06-01', status: 'expired', confirmReason: '授权已过期', nextStep: '紧急联系甲方补签' },
    },
    trigger: 'remark_added',
    createdAt: '2026-06-05T09:00:00Z',
  },
  {
    id: 'h-4',
    entryId: 'seed-3',
    snapshot: {
      remarks: [
        { id: 'r-4', content: '甲方未回复续签邮件', type: 'authorization', createdAt: '2026-06-05T09:00:00Z', version: 1 },
        { id: 'r-5', content: '电话催促后甲方表示下周处理', type: 'authorization', createdAt: '2026-06-10T11:00:00Z', version: 2 },
      ],
      screenshots: [],
      alignmentStatus: 'misaligned',
      authorization: { startDate: '2025-06-01', endDate: '2026-06-01', status: 'expired', confirmReason: '授权已过期13天', nextStep: '紧急联系甲方补签或暂停使用' },
    },
    trigger: 'remark_added',
    createdAt: '2026-06-10T11:00:00Z',
  },
]

interface AppStore {
  entries: TimecodeEntry[]
  history: HistoryEntry[]
  filter: FilterState
  activeEntryId: string | null
  historyDrawerOpen: boolean

  addEntry: (entry: Omit<TimecodeEntry, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateEntry: (id: string, partial: Partial<TimecodeEntry>) => void
  deleteEntry: (id: string) => void
  addRemark: (entryId: string, remark: Omit<RemarkSnapshot, 'id' | 'createdAt' | 'version'>) => void
  addScreenshot: (entryId: string, screenshot: Omit<ScreenshotSnapshot, 'id' | 'createdAt' | 'version'>) => void
  rescan: (entryId: string) => void
  setFilter: (filter: Partial<FilterState>) => void
  clearFilter: () => void
  setActiveEntry: (id: string | null) => void
  toggleHistoryDrawer: () => void
  setHistoryDrawerOpen: (open: boolean) => void
  confirmAuthorization: (entryId: string, reason: string, nextStep: string) => void
  updateReviewStatus: (entryId: string, status: TimecodeEntry['reviewStatus']) => void
  updateAlignmentStatus: (entryId: string, status: TimecodeEntry['alignmentStatus']) => void
  exportSummary: (format?: 'json' | 'csv') => string
  exportChecklist: (format?: 'json' | 'csv') => string
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      entries: SEED_ENTRIES,
      history: SEED_HISTORY,
      filter: { dateRange: null, project: null, status: null },
      activeEntryId: null,
      historyDrawerOpen: false,

      addEntry: (entry) => {
        const t = now()
        const newEntry: TimecodeEntry = {
          ...entry,
          id: genId(),
          createdAt: t,
          updatedAt: t,
        }
        set((s) => ({ entries: [...s.entries, newEntry] }))
      },

      updateEntry: (id, partial) => {
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === id ? { ...e, ...partial, updatedAt: now() } : e
          ),
        }))
      },

      deleteEntry: (id) => {
        set((s) => ({
          entries: s.entries.filter((e) => e.id !== id),
          history: s.history.filter((h) => h.entryId !== id),
          activeEntryId: s.activeEntryId === id ? null : s.activeEntryId,
        }))
      },

      addRemark: (entryId, remark) => {
        const t = now()
        const entry = get().entries.find((e) => e.id === entryId)
        if (!entry) return
        const nextVersion = entry.remarks.length + 1
        const newRemark: RemarkSnapshot = {
          ...remark,
          id: genId(),
          createdAt: t,
          version: nextVersion,
        }
        set((s) => {
          const updatedEntries = s.entries.map((e) => {
            if (e.id !== entryId) return e
            return { ...e, remarks: [...e.remarks, newRemark], updatedAt: t }
          })
          const updatedEntry = updatedEntries.find((e) => e.id === entryId)!
          const historySnap: HistoryEntry = {
            id: genId(),
            entryId,
            snapshot: {
              remarks: updatedEntry.remarks,
              screenshots: updatedEntry.screenshots,
              alignmentStatus: updatedEntry.alignmentStatus,
              authorization: updatedEntry.authorization,
            },
            trigger: 'remark_added',
            createdAt: t,
          }
          return {
            entries: updatedEntries,
            history: [...s.history, historySnap],
          }
        })
      },

      addScreenshot: (entryId, screenshot) => {
        const t = now()
        const entry = get().entries.find((e) => e.id === entryId)
        if (!entry) return
        const nextVersion = entry.screenshots.length + 1
        const newScreenshot: ScreenshotSnapshot = {
          ...screenshot,
          id: genId(),
          createdAt: t,
          version: nextVersion,
        }
        set((s) => {
          const updatedEntries = s.entries.map((e) => {
            if (e.id !== entryId) return e
            return { ...e, screenshots: [...e.screenshots, newScreenshot], updatedAt: t }
          })
          const updatedEntry = updatedEntries.find((e) => e.id === entryId)!
          const historySnap: HistoryEntry = {
            id: genId(),
            entryId,
            snapshot: {
              remarks: updatedEntry.remarks,
              screenshots: updatedEntry.screenshots,
              alignmentStatus: updatedEntry.alignmentStatus,
              authorization: updatedEntry.authorization,
            },
            trigger: 'screenshot_added',
            createdAt: t,
          }
          return {
            entries: updatedEntries,
            history: [...s.history, historySnap],
          }
        })
      },

      rescan: (entryId) => {
        const t = now()
        set((s) => {
          const updatedEntries = s.entries.map((e) => {
            if (e.id !== entryId) return e
            const authStatus = computeAuthStatus(e.authorization.endDate)
            const newAuth = { ...e.authorization, status: authStatus }
            const hasIssue = authStatus === 'expired' || authStatus === 'expiring' || authStatus === 'needs_confirmation'
            const newAlignment: TimecodeEntry['alignmentStatus'] = hasIssue ? 'misaligned' : 'aligned'
            return {
              ...e,
              authorization: newAuth,
              alignmentStatus: newAlignment,
              updatedAt: t,
            }
          })
          const updatedEntry = updatedEntries.find((e) => e.id === entryId)!
          const historySnap: HistoryEntry = {
            id: genId(),
            entryId,
            snapshot: {
              remarks: updatedEntry.remarks,
              screenshots: updatedEntry.screenshots,
              alignmentStatus: updatedEntry.alignmentStatus,
              authorization: updatedEntry.authorization,
            },
            trigger: 'rescan',
            createdAt: t,
          }
          return {
            entries: updatedEntries,
            history: [...s.history, historySnap],
          }
        })
      },

      setFilter: (filter) => {
        set((s) => ({ filter: { ...s.filter, ...filter } }))
      },

      clearFilter: () => {
        set({ filter: { dateRange: null, project: null, status: null } })
      },

      setActiveEntry: (id) => {
        set({ activeEntryId: id })
      },

      toggleHistoryDrawer: () => {
        set((s) => ({ historyDrawerOpen: !s.historyDrawerOpen }))
      },

      setHistoryDrawerOpen: (open) => {
        set({ historyDrawerOpen: open })
      },

      confirmAuthorization: (entryId, reason, nextStep) => {
        const t = now()
        set((s) => {
          const updatedEntries = s.entries.map((e) => {
            if (e.id !== entryId) return e
            return {
              ...e,
              authorization: {
                ...e.authorization,
                status: 'needs_confirmation' as const,
                confirmReason: reason,
                nextStep,
              },
              updatedAt: t,
            }
          })
          const updatedEntry = updatedEntries.find((e) => e.id === entryId)!
          const historySnap: HistoryEntry = {
            id: genId(),
            entryId,
            snapshot: {
              remarks: updatedEntry.remarks,
              screenshots: updatedEntry.screenshots,
              alignmentStatus: updatedEntry.alignmentStatus,
              authorization: updatedEntry.authorization,
            },
            trigger: 'manual_override',
            createdAt: t,
          }
          return {
            entries: updatedEntries,
            history: [...s.history, historySnap],
          }
        })
      },

      updateReviewStatus: (entryId, status) => {
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === entryId ? { ...e, reviewStatus: status, updatedAt: now() } : e
          ),
        }))
      },

      updateAlignmentStatus: (entryId, status) => {
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === entryId ? { ...e, alignmentStatus: status, updatedAt: now() } : e
          ),
        }))
      },

      exportSummary: (format: 'json' | 'csv' = 'json') => {
        const { entries, filter, history } = get()
        const filtered = applyFilter(entries, filter)
        if (format === 'csv') {
          return buildChecklistCsv(filtered, history)
        }
        return JSON.stringify(buildSummaryJson(filtered, history, filter), null, 2)
      },

      exportChecklist: (format: 'json' | 'csv' = 'json') => {
        const { entries, filter, history } = get()
        const filtered = applyFilter(entries, filter)
        if (format === 'csv') {
          return buildChecklistCsv(filtered, history)
        }
        return JSON.stringify(buildChecklistJson(filtered, history, filter), null, 2)
      },
    }),
    {
      name: 'studio-timecode-alignment-store',
    }
  )
)

function applyFilter(entries: TimecodeEntry[], filter: FilterState): TimecodeEntry[] {
  let result = entries
  if (filter.project) {
    result = result.filter((e) => e.projectName === filter.project)
  }
  if (filter.status) {
    result = result.filter((e) => e.alignmentStatus === filter.status || e.authorization.status === filter.status || e.reviewStatus === filter.status)
  }
  if (filter.dateRange) {
    result = result.filter((e) => {
      const entryDate = new Date(e.timeRange.start)
      const start = new Date(filter.dateRange!.start)
      const end = new Date(filter.dateRange!.end)
      return entryDate >= start && entryDate <= end
    })
  }
  return result
}

export { applyFilter }
