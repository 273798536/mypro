import { create } from 'zustand'
import type { ConflictRecord, FilterCriteria, ExportConfig, Remark, SupplementaryRemark } from '@/types'
import { DEFAULT_FILTER, DEFAULT_EXPORT_CONFIG } from '@/types'

const INITIAL_DATA: ConflictRecord[] = [
  {
    id: 'demo-001',
    songName: '月光奏鸣曲',
    songAlias: ['Moonlight Sonata', '月光'],
    timecodeStart: '01:23:45:12',
    timecodeEnd: '01:25:30:00',
    authPeriodStart: '2024-01-01',
    authPeriodEnd: '2025-12-31',
    status: 'conflict',
    exceptionReason: '与「月光小夜曲」的时码区间重叠，授权期限在备注中标注为延期6个月',
    remarks: [{ id: 'r-001', content: '授权期限延期6个月，至2025-12-31', createdAt: '2024-06-15' }],
    supplementaryRemarks: [],
    contractScanUrl: null,
    contractScanName: null,
    createdAt: '2024-01-10',
    updatedAt: '2024-06-15',
  },
  {
    id: 'demo-002',
    songName: '春江花月夜',
    songAlias: ['春江', '花月夜'],
    timecodeStart: '02:00:00:00',
    timecodeEnd: '02:05:15:20',
    authPeriodStart: '2024-03-01',
    authPeriodEnd: '2025-02-28',
    status: 'normal',
    exceptionReason: '',
    remarks: [],
    supplementaryRemarks: [],
    contractScanUrl: null,
    contractScanName: null,
    createdAt: '2024-03-05',
    updatedAt: '2024-03-05',
  },
  {
    id: 'demo-003',
    songName: '月光小夜曲',
    songAlias: ['Moonlight', '月光'],
    timecodeStart: '01:24:00:00',
    timecodeEnd: '01:27:00:00',
    authPeriodStart: '2024-02-01',
    authPeriodEnd: '2025-01-31',
    status: 'conflict',
    exceptionReason: '与「月光奏鸣曲」时码重叠，且别名「月光」重复',
    remarks: [{ id: 'r-003', content: '原合同授权期只到2025-01-31，需确认是否续约', createdAt: '2024-07-20' }],
    supplementaryRemarks: [
      {
        id: 'sr-001',
        content: '续约确认中，临时授权延期至2025-06-30',
        changeDescription: '授权期限从2025-01-31延期至2025-06-30',
        createdAt: '2025-01-15',
        operator: '林姐',
      },
    ],
    contractScanUrl: null,
    contractScanName: null,
    createdAt: '2024-02-10',
    updatedAt: '2025-01-15',
  },
  {
    id: 'demo-004',
    songName: '高山流水',
    songAlias: ['流水', '高山'],
    timecodeStart: '03:10:00:00',
    timecodeEnd: '03:15:00:00',
    authPeriodStart: '2023-06-01',
    authPeriodEnd: '2024-05-31',
    status: 'pending',
    exceptionReason: '授权已过期，等待续约确认',
    remarks: [],
    supplementaryRemarks: [],
    contractScanUrl: null,
    contractScanName: null,
    createdAt: '2023-06-05',
    updatedAt: '2024-06-01',
  },
  {
    id: 'demo-005',
    songName: '二泉映月',
    songAlias: ['二泉', '映月'],
    timecodeStart: '01:23:50:00',
    timecodeEnd: '01:28:00:00',
    authPeriodStart: '2024-01-01',
    authPeriodEnd: '2025-12-31',
    status: 'conflict',
    exceptionReason: '时码与「月光奏鸣曲」和「月光小夜曲」三方重叠，需重新排期',
    remarks: [{ id: 'r-005', content: '三方冲突，建议重新分配时码区间', createdAt: '2024-08-01' }],
    supplementaryRemarks: [],
    contractScanUrl: null,
    contractScanName: null,
    createdAt: '2024-01-15',
    updatedAt: '2024-08-01',
  },
]

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function loadFromStorage(): ConflictRecord[] {
  try {
    const stored = localStorage.getItem('studio-conflict-records')
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return INITIAL_DATA
}

function saveToStorage(records: ConflictRecord[]): void {
  localStorage.setItem('studio-conflict-records', JSON.stringify(records))
}

interface StoreState {
  records: ConflictRecord[]
  filter: FilterCriteria
  exportConfig: ExportConfig
  editingRecord: ConflictRecord | null
  isFormOpen: boolean

  setFilter: (filter: Partial<FilterCriteria>) => void
  resetFilter: () => void
  setExportConfig: (config: Partial<ExportConfig>) => void
  addRecord: (record: Omit<ConflictRecord, 'id' | 'createdAt' | 'updatedAt' | 'remarks' | 'supplementaryRemarks'>) => void
  updateRecord: (id: string, updates: Partial<ConflictRecord>) => void
  deleteRecord: (id: string) => void
  addRemark: (recordId: string, content: string) => void
  addSupplementaryRemark: (recordId: string, content: string, changeDescription: string, operator: string) => void
  openForm: (record: ConflictRecord | null) => void
  closeForm: () => void
  importRecords: (records: ConflictRecord[]) => void
  resetToDemo: () => void
}

export const useStore = create<StoreState>((set, get) => ({
  records: loadFromStorage(),
  filter: { ...DEFAULT_FILTER },
  exportConfig: { ...DEFAULT_EXPORT_CONFIG },
  editingRecord: null,
  isFormOpen: false,

  setFilter: (partial) => {
    const current = get().filter
    const next = { ...current, ...partial }
    set({ filter: next })
  },

  resetFilter: () => set({ filter: { ...DEFAULT_FILTER } }),

  setExportConfig: (partial) => {
    const current = get().exportConfig
    const next = { ...current, ...partial }
    set({ exportConfig: next })
  },

  addRecord: (record) => {
    const now = new Date().toISOString().slice(0, 10)
    const newRecord: ConflictRecord = {
      ...record,
      id: generateId(),
      remarks: [],
      supplementaryRemarks: [],
      createdAt: now,
      updatedAt: now,
    }
    const records = [...get().records, newRecord]
    saveToStorage(records)
    set({ records })
  },

  updateRecord: (id, updates) => {
    const records = get().records.map((r) =>
      r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString().slice(0, 10) } : r,
    )
    saveToStorage(records)
    set({ records })
  },

  deleteRecord: (id) => {
    const records = get().records.filter((r) => r.id !== id)
    saveToStorage(records)
    set({ records })
  },

  addRemark: (recordId, content) => {
    const now = new Date().toISOString().slice(0, 10)
    const remark: Remark = { id: generateId(), content, createdAt: now }
    const records = get().records.map((r) =>
      r.id === recordId
        ? { ...r, remarks: [...r.remarks, remark], updatedAt: now }
        : r,
    )
    saveToStorage(records)
    set({ records })
  },

  addSupplementaryRemark: (recordId, content, changeDescription, operator) => {
    const now = new Date().toISOString().slice(0, 10)
    const sr: SupplementaryRemark = {
      id: generateId(),
      content,
      changeDescription,
      createdAt: now,
      operator,
    }
    const records = get().records.map((r) =>
      r.id === recordId
        ? { ...r, supplementaryRemarks: [...r.supplementaryRemarks, sr], updatedAt: now }
        : r,
    )
    saveToStorage(records)
    set({ records })
  },

  openForm: (record) => set({ editingRecord: record, isFormOpen: true }),
  closeForm: () => set({ editingRecord: null, isFormOpen: false }),

  importRecords: (newRecords) => {
    const records = [...get().records, ...newRecords]
    saveToStorage(records)
    set({ records })
  },

  resetToDemo: () => {
    saveToStorage(INITIAL_DATA)
    set({ records: INITIAL_DATA, filter: { ...DEFAULT_FILTER } })
  },
}))
