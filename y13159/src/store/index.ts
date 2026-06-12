import { create } from 'zustand'
import { AppState, ReportData, WithdrawRecord } from '@/types'
import { mockData } from '@/data/mockData'

interface Store extends AppState {
  loadMockData: () => void
  importData: (data: ReportData) => void
  setSelectedParamGroup: (group: 'A' | 'B') => void
  setActiveTab: (tab: string) => void
  addWithdrawRecord: (record: Omit<WithdrawRecord, 'id' | 'timestamp'>) => void
  setHighlightedRow: (row: number | null) => void
  exportReport: () => string
  recalcMeta: () => void
}

export const useStore = create<Store>((set, get) => ({
  data: null,
  isLoaded: false,
  selectedParamGroup: 'A',
  activeTab: 'overview',
  highlightedRow: null,

  loadMockData: () => {
    set({ data: JSON.parse(JSON.stringify(mockData)), isLoaded: true })
  },

  importData: (data: ReportData) => {
    set({ data, isLoaded: true })
  },

  setSelectedParamGroup: (group) => {
    set({ selectedParamGroup: group })
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab })
  },

  addWithdrawRecord: (record) => {
    const { data } = get()
    if (!data) return
    const newRecord: WithdrawRecord = {
      ...record,
      id: Math.max(...data.withdraw_records.map(r => r.id), 0) + 1,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    }
    const newData = {
      ...data,
      withdraw_records: [...data.withdraw_records, newRecord],
    }
    set({ data: newData })
    get().recalcMeta()
  },

  setHighlightedRow: (row) => {
    set({ highlightedRow: row })
  },

  exportReport: () => {
    const { data } = get()
    if (!data) return ''
    return JSON.stringify(data, null, 2)
  },

  recalcMeta: () => {
    const { data } = get()
    if (!data) return
    const total = data.nameplate.length
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
}))
