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
  loading: boolean;
  loadingText: string;
  toggleSidebar: () => void;
  openDetailDrawer: (id: string) => void;
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
  loading: false,
  loadingText: '',

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  openDetailDrawer: (id: string) =>
    set({ activeDetailId: id, detailDrawerOpen: true }),

  closeDetailDrawer: () =>
    set({ activeDetailId: null, detailDrawerOpen: false }),

  showToast: (type, message, duration = 3000) => {
    const id = crypto.randomUUID();
    set((state) => ({
      toasts: [...state.toasts, { id, type, message, duration }],
    }));
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id: string) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  setLoading: (loading, text = '') =>
    set({ loading, loadingText: text }),
}));
