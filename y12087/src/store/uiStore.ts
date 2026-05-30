import { create } from 'zustand';
import type { UIState } from '@/types';

interface UIActions {
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
  setSelectedStreamlineId: (id: string | null) => void;
  setSelectedAnomalyId: (id: string | null) => void;
  setHoveredPoint: (point: [number, number, number] | null) => void;
  setLoading: (loading: boolean, message?: string) => void;
  setLoadingProgress: (progress: number) => void;
  setErrorMessage: (message: string | null) => void;
}

export const useUIStore = create<UIState & UIActions>((set) => ({
  leftSidebarOpen: true,
  rightSidebarOpen: true,
  selectedStreamlineId: null,
  selectedAnomalyId: null,
  hoveredPoint: null,
  isLoading: false,
  loadingMessage: '',
  loadingProgress: 0,
  errorMessage: null,

  toggleLeftSidebar: () => {
    set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen }));
  },

  toggleRightSidebar: () => {
    set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen }));
  },

  setLeftSidebarOpen: (open) => {
    set({ leftSidebarOpen: open });
  },

  setRightSidebarOpen: (open) => {
    set({ rightSidebarOpen: open });
  },

  setSelectedStreamlineId: (id) => {
    set({ selectedStreamlineId: id });
  },

  setSelectedAnomalyId: (id) => {
    set({ selectedAnomalyId: id });
  },

  setHoveredPoint: (point) => {
    set({ hoveredPoint: point });
  },

  setLoading: (loading, message = '') => {
    set({ isLoading: loading, loadingMessage: message });
  },

  setLoadingProgress: (progress) => {
    set({ loadingProgress: progress });
  },

  setErrorMessage: (message) => {
    set({ errorMessage: message });
  },
}));
