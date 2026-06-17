import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ToastKind = 'success' | 'error' | 'info'
interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface UiState {
  reviewer: string
  setReviewer: (name: string) => void
  toasts: Toast[]
  toast: (message: string, kind?: ToastKind) => void
  dismiss: (id: number) => void
}

let toastId = 0

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      reviewer: 'platform-engineer',
      setReviewer: (name) => set({ reviewer: name || 'platform-engineer' }),
      toasts: [],
      toast: (message, kind = 'info') => {
        const id = ++toastId
        set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }))
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
        }, 3200)
      },
      dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    { name: 'bias-review-ui', partialize: (s) => ({ reviewer: s.reviewer }) },
  ),
)
