import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastState {
  toasts: ToastItem[]
  addToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (type, message, duration = 3000) => {
    const id = Math.random().toString(36).slice(2, 10)
    set((state) => ({ toasts: [...state.toasts, { id, type, message, duration }] }))
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
      }, duration)
    }
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

export const useToast = () => {
  const { addToast, removeToast, toasts } = useToastStore()
  return {
    toasts,
    success: (msg: string, duration?: number) => addToast('success', msg, duration),
    error: (msg: string, duration?: number) => addToast('error', msg, duration),
    info: (msg: string, duration?: number) => addToast('info', msg, duration),
    warning: (msg: string, duration?: number) => addToast('warning', msg, duration),
    remove: removeToast,
  }
}
