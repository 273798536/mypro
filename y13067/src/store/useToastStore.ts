import { create } from 'zustand'
import type { ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'loading' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  updateToast: (id: string, updates: Partial<Omit<Toast, 'id'>>) => void
  success: (title: string, description?: string) => string
  error: (title: string, description?: string) => string
  loading: (title: string, description?: string) => string
  info: (title: string, description?: string) => string
  warning: (title: string, description?: string) => string
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    if (toast.type !== 'loading') {
      setTimeout(() => get().removeToast(id), 4000)
    }
    return id
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  updateToast: (id, updates) =>
    set((s) => ({
      toasts: s.toasts.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  success: (title, description) =>
    get().addToast({ type: 'success', title, description }),

  error: (title, description) =>
    get().addToast({ type: 'error', title, description }),

  loading: (title, description) =>
    get().addToast({ type: 'loading', title, description }),

  info: (title, description) =>
    get().addToast({ type: 'info', title, description }),

  warning: (title, description) =>
    get().addToast({ type: 'warning', title, description }),
}))
