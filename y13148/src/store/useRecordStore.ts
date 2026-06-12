import { create } from 'zustand'
import type { DataRecord, RecordSource, RecordStatus } from '@/types'
import { mockRecords } from '@/data/mockRecords'
import { generateId } from '@/utils/format'

interface RecordState {
  records: DataRecord[]
  addRecord: (record: Omit<DataRecord, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateRecord: (id: string, updates: Partial<DataRecord>) => void
  deleteRecord: (id: string) => void
  getRecordById: (id: string) => DataRecord | undefined
  getRecordsBySource: (source: RecordSource) => DataRecord[]
  getRecordsByStatus: (status: RecordStatus) => DataRecord[]
}

export const useRecordStore = create<RecordState>((set, get) => ({
  records: mockRecords,

  addRecord: (record) => {
    const now = new Date().toISOString()
    const newRecord: DataRecord = {
      ...record,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    set((state) => ({ records: [...state.records, newRecord] }))
  },

  updateRecord: (id, updates) => {
    const now = new Date().toISOString()
    set((state) => ({
      records: state.records.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: now } : r
      ),
    }))
  },

  deleteRecord: (id) => {
    set((state) => ({
      records: state.records.filter((r) => r.id !== id),
    }))
  },

  getRecordById: (id) => {
    return get().records.find((r) => r.id === id)
  },

  getRecordsBySource: (source) => {
    return get().records.filter((r) => r.source === source)
  },

  getRecordsByStatus: (status) => {
    return get().records.filter((r) => r.status === status)
  },
}))
