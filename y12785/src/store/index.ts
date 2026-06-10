import { create } from 'zustand'

export type BatchStatus = 'imported' | 'analyzing' | 'pending_review' | 'approved' | 'rejected' | 'exported'
export type UserRole = 'material_engineer' | 'quality_supervisor'

export interface Batch {
  id: string
  batchNo: string
  status: BatchStatus
  weighingPrecision: '0.1mg' | '0.01mg' | '1mg'
  createdAt: string
  updatedAt: string
}

export interface SafetyHintItem {
  id: string
  batchId: string
  content: string
  sourceMaterial: string
  sourceUrl?: string
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  actionableHint?: string
  missingData?: string[]
}

interface AppState {
  batches: Batch[]
  currentRole: UserRole
  safetyHints: SafetyHintItem[]
  toasts: ToastMessage[]
  setBatches: (batches: Batch[]) => void
  addBatch: (batch: Batch) => void
  updateBatch: (id: string, updates: Partial<Batch>) => void
  setCurrentRole: (role: UserRole) => void
  setSafetyHints: (hints: SafetyHintItem[]) => void
  addToast: (toast: Omit<ToastMessage, 'id'>) => void
  removeToast: (id: string) => void
}

let toastCounter = 0

export const useAppStore = create<AppState>((set) => ({
  batches: [],
  currentRole: 'material_engineer',
  safetyHints: [],
  toasts: [],
  setBatches: (batches) => set({ batches }),
  addBatch: (batch) => set((s) => ({ batches: [...s.batches, batch] })),
  updateBatch: (id, updates) =>
    set((s) => ({
      batches: s.batches.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),
  setCurrentRole: (currentRole) => set({ currentRole }),
  setSafetyHints: (safetyHints) => set({ safetyHints }),
  addToast: (toast) => {
    const id = `toast-${++toastCounter}`
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 5000)
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
