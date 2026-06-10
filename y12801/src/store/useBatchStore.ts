import { create } from 'zustand'
import type { Batch, DataConflict } from '@/types'
import { mockBatches, mockDataConflicts } from '@/data/mockData'

interface BatchState {
  batches: Batch[]
  selectedBatchId: string | null
  dataConflicts: DataConflict[]

  selectBatch: (batchId: string | null) => void
  updateBatchStatus: (batchId: string, status: Batch['status']) => void
  addDataConflict: (conflict: DataConflict) => void
  resolveConflict: (sampleId: string, fieldName: string) => void
  getBatchById: (batchId: string) => Batch | undefined
}

export const useBatchStore = create<BatchState>((set, get) => ({
  batches: mockBatches,
  selectedBatchId: null,
  dataConflicts: mockDataConflicts,

  selectBatch: (batchId) => set({ selectedBatchId: batchId }),

  updateBatchStatus: (batchId, status) =>
    set((state) => ({
      batches: state.batches.map((b) =>
        b.id === batchId ? { ...b, status } : b
      ),
    })),

  addDataConflict: (conflict) =>
    set((state) => ({
      dataConflicts: [...state.dataConflicts, conflict],
    })),

  resolveConflict: (sampleId, fieldName) =>
    set((state) => ({
      dataConflicts: state.dataConflicts.map((c) =>
        c.sampleId === sampleId && c.fieldName === fieldName
          ? { ...c, resolved: true }
          : c
      ),
    })),

  getBatchById: (batchId) => get().batches.find((b) => b.id === batchId),
}))
