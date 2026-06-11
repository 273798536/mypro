import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ViewMode, ChartFilters } from '../types';

interface AppState {
  selectedPointId: string | null;
  viewMode: ViewMode;
  filters: ChartFilters;
  showOpsGuide: boolean;
  showExportModal: boolean;
  showDetailPanel: boolean;
  activeTab: 'detail' | 'history' | 'trace';
}

interface AppActions {
  selectPoint: (pointId: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setFilters: (filters: Partial<ChartFilters>) => void;
  toggleOpsGuide: () => void;
  toggleExportModal: () => void;
  toggleDetailPanel: () => void;
  setActiveTab: (tab: 'detail' | 'history' | 'trace') => void;
  setShowOpsGuide: (show: boolean) => void;
}

export type AppStore = AppState & AppActions;

const initialFilters: ChartFilters = {
  boomIds: [],
  timeRangeStart: null,
  timeRangeEnd: null,
};

const initialState: AppState = {
  selectedPointId: null,
  viewMode: 'all',
  filters: initialFilters,
  showOpsGuide: false,
  showExportModal: false,
  showDetailPanel: true,
  activeTab: 'detail',
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...initialState,

      selectPoint: (pointId: string | null) => {
        set({ selectedPointId: pointId });
        if (pointId) {
          set({ showDetailPanel: true });
        }
      },

      setViewMode: (mode: ViewMode) => {
        set({ viewMode: mode });
      },

      setFilters: (filters: Partial<ChartFilters>) => {
        set(state => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      toggleOpsGuide: () => {
        set(state => ({ showOpsGuide: !state.showOpsGuide }));
      },

      toggleExportModal: () => {
        set(state => ({ showExportModal: !state.showExportModal }));
      },

      toggleDetailPanel: () => {
        set(state => ({ showDetailPanel: !state.showDetailPanel }));
      },

      setActiveTab: (tab: 'detail' | 'history' | 'trace') => {
        set({ activeTab: tab });
      },

      setShowOpsGuide: (show: boolean) => {
        set({ showOpsGuide: show });
      },
    }),
    {
      name: 'theater-boom-timeline-app',
      version: 1,
      partialize: (state) => ({
        viewMode: state.viewMode,
        filters: state.filters,
        showDetailPanel: state.showDetailPanel,
        activeTab: state.activeTab,
      }),
    }
  )
);
