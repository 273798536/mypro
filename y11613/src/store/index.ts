import { create } from 'zustand';

interface AppState {
  operator: string;
  setOperator: (name: string) => void;
  toast: { message: string; type: 'success' | 'error' | 'warning' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
  hideToast: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  operator: localStorage.getItem('operator') || '系统管理员',
  setOperator: (name) => {
    localStorage.setItem('operator', name);
    set({ operator: name });
  },
  toast: null,
  showToast: (message, type = 'success') => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 3000);
  },
  hideToast: () => set({ toast: null }),
}));
