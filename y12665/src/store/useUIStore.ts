import { create } from 'zustand';
import type { Screenshot } from '../../shared/types';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ScreenshotPreview {
  screenshot: Screenshot | null;
  open: boolean;
}

interface UIState {
  sidebarCollapsed: boolean;
  activeTab: string;
  screenshotPreview: ScreenshotPreview;
  toast: Toast | null;

  toggleSidebar: () => void;
  setActiveTab: (tab: string) => void;
  openScreenshotPreview: (screenshot: Screenshot) => void;
  closeScreenshotPreview: () => void;
  showToast: (message: string, type?: Toast['type']) => void;
}

const generateId = () => Math.random().toString(36).slice(2, 9);

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  activeTab: 'exercises',
  screenshotPreview: {
    screenshot: null,
    open: false,
  },
  toast: null,

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  openScreenshotPreview: (screenshot) => {
    set({
      screenshotPreview: {
        screenshot,
        open: true,
      },
    });
  },

  closeScreenshotPreview: () => {
    set({
      screenshotPreview: {
        screenshot: null,
        open: false,
      },
    });
  },

  showToast: (message, type = 'info') => {
    const id = generateId();
    set({ toast: { id, message, type } });
    setTimeout(() => {
      set((state) => {
        if (state.toast?.id === id) {
          return { toast: null };
        }
        return {};
      });
    }, 3000);
  },
}));
