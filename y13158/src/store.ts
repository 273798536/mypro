import { create } from 'zustand'
import type {
  AttributionRecord,
  ParameterVersion,
  MaterialChange,
  ManualOverride,
  AnomalyPoint,
  RecordStatus,
  BlockPointType,
  AnomalyLevel,
} from '@/types'
import {
  mockRecords,
  mockParameterVersions,
  mockMaterialChanges,
  mockManualOverrides,
  mockAnomalyPoints,
} from '@/mockData'

interface FilterState {
  status: RecordStatus | 'all'
  blockPoint: BlockPointType | 'all'
  anomalyLevel: AnomalyLevel | 'all'
}

interface StoreState {
  records: AttributionRecord[]
  parameterVersions: ParameterVersion[]
  materialChanges: MaterialChange[]
  manualOverrides: ManualOverride[]
  anomalyPoints: AnomalyPoint[]
  filters: FilterState
  isRunning: boolean
  lastRunAt: string | null

  setFilter: (key: keyof FilterState, value: string) => void
  resetFilters: () => void
  startRun: () => void
  finishRun: () => void
  addManualOverride: (override: ManualOverride) => void
  updateRecordStatus: (recordId: string, status: RecordStatus) => void
}

const defaultFilters: FilterState = {
  status: 'all',
  blockPoint: 'all',
  anomalyLevel: 'all',
}

export const useStore = create<StoreState>((set) => ({
  records: mockRecords,
  parameterVersions: mockParameterVersions,
  materialChanges: mockMaterialChanges,
  manualOverrides: mockManualOverrides,
  anomalyPoints: mockAnomalyPoints,
  filters: defaultFilters,
  isRunning: false,
  lastRunAt: null,

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value } as FilterState,
    })),

  resetFilters: () => set({ filters: defaultFilters }),

  startRun: () => set({ isRunning: true }),

  finishRun: () =>
    set({
      isRunning: false,
      lastRunAt: new Date().toISOString(),
    }),

  addManualOverride: (override) =>
    set((state) => ({
      manualOverrides: [...state.manualOverrides, override],
    })),

  updateRecordStatus: (recordId, status) =>
    set((state) => ({
      records: state.records.map((r) =>
        r.id === recordId ? { ...r, status, updatedAt: new Date().toISOString() } : r
      ),
    })),
}))
