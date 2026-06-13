import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WarningRecord } from '@/types'
import SEED_DATA from '@/data/seed'

interface AppState {
  records: WarningRecord[]
  initialized: boolean

  addRecord: (record: Omit<WarningRecord, 'id' | 'lastModified'>) => string
  updateRecord: (id: string, updates: Partial<WarningRecord>) => void
  confirmSuspended: (id: string) => void
  rejectSuspended: (id: string) => void
  resetToSeed: () => void
  ensureInitialized: () => void
}

const generateId = () => `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const checkDuplicateDevice = (records: WarningRecord[], deviceId: string, excludeId?: string): boolean => {
  return records.some(
    (r) =>
      r.deviceId === deviceId &&
      r.id !== excludeId &&
      (r.status === 'warning' || r.status === 'suspended')
  )
}

const computeStatus = (
  measuredValue: number,
  threshold: number,
  deviceId: string,
  records: WarningRecord[],
  excludeId?: string
): WarningRecord['status'] => {
  if (checkDuplicateDevice(records, deviceId, excludeId)) {
    return 'suspended'
  }
  return measuredValue > threshold ? 'warning' : 'normal'
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      records: [],
      initialized: false,

      addRecord: (record) => {
        const id = generateId()
        const status = computeStatus(record.measuredValue, record.threshold, record.deviceId, get().records)
        const now = new Date().toISOString()
        const newRecord: WarningRecord = {
          ...record,
          id,
          status,
          lastModified: now,
        }
        set((state) => ({
          records: [newRecord, ...state.records],
          initialized: true,
        }))
        return id
      },

      updateRecord: (id, updates) => {
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id
              ? { ...r, ...updates, lastModified: new Date().toISOString() }
              : r
          ),
        }))
      },

      confirmSuspended: (id) => {
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id
              ? { ...r, status: 'confirmed', lastModified: new Date().toISOString() }
              : r
          ),
        }))
      },

      rejectSuspended: (id) => {
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id
              ? { ...r, status: 'rejected', lastModified: new Date().toISOString() }
              : r
          ),
        }))
      },

      resetToSeed: () => {
        set({ records: SEED_DATA, initialized: true })
      },

      ensureInitialized: () => {
        const state = get()
        if (!state.initialized || state.records.length === 0) {
          set({ records: SEED_DATA, initialized: true })
        }
      },
    }),
    {
      name: 'beam-deflection-warning-storage',
    }
  )
)
