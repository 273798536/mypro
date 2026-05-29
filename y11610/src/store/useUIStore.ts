import { create } from 'zustand';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface UIState {
  sidebarCollapsed: boolean;
  activeDetailId: string | null;
  detailDrawerOpen: boolean;
  toasts: ToastMessage[];
  toast: ToastMessage | null;
  loading: boolean;
  loadingText: string;
  toggleSidebar: () => void;
  openDetailDrawer: (id: string) => void;
  openDetail: (type: string, id: string) => void;
  closeDetailDrawer: () => void;
  showToast: (type: ToastMessage['type'], message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  setLoading: (loading: boolean, text?: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  activeDetailId: null,
  detailDrawerOpen: false,
  toasts: [],
  toast: null,
  loading: false,
  loadingText: '',

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  openDetailDrawer: (id: string) =>
    set({ activeDetailId: id, detailDrawerOpen: true }),

  openDetail: (type: string, id: string) =>
    set({ activeDetailId: id, detailDrawerOpen: true }),

  closeDetailDrawer: () =>
    set({ activeDetailId: null, detailDrawerOpen: false }),

  showToast: (type, message, duration = 3000) => {
    const id = crypto.randomUUID();
    const newToast = { id, type, message, duration };
    set((state) => ({
      toasts: [...state.toasts, newToast],
      toast: newToast,
    }));
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id: string) =>
    set((state) => {
      const newToasts = state.toasts.filter((t) => t.id !== id);
      return {
        toasts: newToasts,
        toast: newToasts.length > 0 ? newToasts[newToasts.length - 1] : null,
      };
    }),

  setLoading: (loading, text = '') =>
    set({ loading, loadingText: text }),
}));
