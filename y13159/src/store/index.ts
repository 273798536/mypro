import { create } from 'zustand'
import { AppState, ReportData, WithdrawRecord } from '@/types'
import { mockData } from '@/data/mockData'
import {
  validateAndSanitizeReportData,
  nextSafeId,
  ImportResult,
} from '@/utils/importValidator'

export type ImportFeedback =
  | { status: 'success'; fileName: string; warnings: string[]; counts: Record<string, number> }
  | { status: 'error'; fileName: string; errors: string[] }
  | { status: 'info'; message: string }

interface Store extends AppState {
  importFeedback: ImportFeedback | null
  loadMockData: () => void
  importData: (raw: unknown, fileName?: string) => void
  clearImportFeedback: () => void
  setSelectedParamGroup: (group: 'A' | 'B') => void
  setActiveTab: (tab: string) => void
  addWithdrawRecord: (record: Omit<WithdrawRecord, 'id' | 'timestamp'>) => boolean
  setHighlightedRow: (row: number | null) => void
  exportReport: () => string
  recalcMeta: () => void
  resetAll: () => void
}

function applySanitized(result: Extract<ImportResult, { ok: true }>): ReportData {
  return result.data
}

export const useStore = create<Store>((set, get) => ({
  data: null,
  isLoaded: false,
  selectedParamGroup: 'A',
  activeTab: 'overview',
  highlightedRow: null,
  importFeedback: null,

  loadMockData: () => {
    const result = validateAndSanitizeReportData(JSON.parse(JSON.stringify(mockData)))
    if (!result.ok) {
      set({
        importFeedback: {
          status: 'error',
          fileName: '内置示例数据',
          errors: result.errors,
        },
      })
      return
    }
    const data = applySanitized(result)
    set({
      data,
      isLoaded: true,
      importFeedback: {
        status: 'success',
        fileName: '内置示例数据 (demo_dataset.json)',
        warnings: result.warnings,
        counts: {
          nameplate: data.nameplate.length,
          symbol_errors: data.symbol_errors.length,
          withdraw_records: data.withdraw_records.length,
          calculation_steps: data.calculation_steps.length,
        },
      },
    })
  },

  importData: (raw, fileName = '导入文件') => {
    const result = validateAndSanitizeReportData(raw)
    if (!result.ok) {
      set({
        importFeedback: { status: 'error', fileName, errors: result.errors },
      })
      return
    }
    const data = applySanitized(result)
    set({
      data,
      isLoaded: true,
      highlightedRow: null,
      importFeedback: {
        status: 'success',
        fileName,
        warnings: result.warnings,
        counts: {
          nameplate: data.nameplate.length,
          symbol_errors: data.symbol_errors.length,
          withdraw_records: data.withdraw_records.length,
          calculation_steps: data.calculation_steps.length,
        },
      },
    })
  },

  clearImportFeedback: () => set({ importFeedback: null }),

  setSelectedParamGroup: (group) => {
    set({ selectedParamGroup: group })
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab })
  },

  addWithdrawRecord: (record) => {
    const { data } = get()
    if (!data) return false
    const id = nextSafeId(data.withdraw_records)
    const newRecord: WithdrawRecord = {
      ...record,
      id,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    }
    const newData: ReportData = {
      ...data,
      withdraw_records: [...data.withdraw_records, newRecord],
    }
    set({ data: newData })
    get().recalcMeta()
    return true
  },

  setHighlightedRow: (row) => {
    set({ highlightedRow: row })
  },

  exportReport: () => {
    const { data } = get()
    if (!data) return ''
    get().recalcMeta()
    // 导出时再次读取已更新的data
    const latest = get().data!
    return JSON.stringify(latest, null, 2)
  },

  recalcMeta: () => {
    const { data } = get()
    if (!data) return
    const total = data.nameplate.length || 0
    const matched = data.nameplate.filter(r => r.remark_status === 'matched').length
    set({
      data: {
        ...data,
        meta: {
          ...data.meta,
          withdraw_count: data.withdraw_records.length,
          symbol_error_count: data.symbol_errors.length,
          bad_data_count: data.nameplate.filter(r => r.bad_data_flag).length,
          remark_match_rate: total > 0 ? matched / total : 0,
        },
      },
    })
  },

  resetAll: () => {
    set({
      data: null,
      isLoaded: false,
      highlightedRow: null,
      importFeedback: null,
    })
    get().loadMockData()
  },
}))
