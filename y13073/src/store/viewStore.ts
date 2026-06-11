import { create } from 'zustand';
import { SavedView, FilterConditions, ChartState } from '../types';
import { STORAGE_KEYS } from '../utils/constants';

interface ViewState {
  savedViews: SavedView[];
  chartState: ChartState;
  activeViewId: string | null;
  showGuide: boolean;
  
  loadSavedViews: () => void;
  saveView: (name: string, filterConditions: FilterConditions, chartState: ChartState, thumbnail?: string) => void;
  deleteView: (id: string) => void;
  applyView: (id: string) => SavedView | null;
  setChartState: (state: ChartState) => void;
  setActiveView: (id: string | null) => void;
  toggleGuide: () => void;
  setShowGuide: (show: boolean) => void;
}

const loadViewsFromStorage = (): SavedView[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.savedViews);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load saved views:', e);
  }
  return [];
};

const saveViewsToStorage = (views: SavedView[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.savedViews, JSON.stringify(views));
  } catch (e) {
    console.error('Failed to save views:', e);
  }
};

export const useViewStore = create<ViewState>((set, get) => ({
  savedViews: loadViewsFromStorage(),
  chartState: {
    zoom: 1,
    center: { x: 0, y: 0 },
  },
  activeViewId: null,
  showGuide: false,

  loadSavedViews: () => {
    set({ savedViews: loadViewsFromStorage() });
  },

  saveView: (name: string, filterConditions: FilterConditions, chartState: ChartState, thumbnail?: string) => {
    const newView: SavedView = {
      id: `VIEW-${Date.now()}`,
      name,
      filterConditions: JSON.parse(JSON.stringify(filterConditions)),
      zoomLevel: chartState.zoom,
      center: { ...chartState.center },
      createdAt: new Date().toISOString(),
      thumbnail,
    };
    
    const updated = [...get().savedViews, newView];
    saveViewsToStorage(updated);
    set({ savedViews: updated });
  },

  deleteView: (id: string) => {
    const updated = get().savedViews.filter((v) => v.id !== id);
    saveViewsToStorage(updated);
    set({ 
      savedViews: updated,
      activeViewId: get().activeViewId === id ? null : get().activeViewId,
    });
  },

  applyView: (id: string): SavedView | null => {
    const view = get().savedViews.find((v) => v.id === id);
    if (view) {
      set({ 
        activeViewId: id,
        chartState: {
          zoom: view.zoomLevel,
          center: { ...view.center },
        },
      });
      return view;
    }
    return null;
  },

  setChartState: (state: ChartState) => {
    set({ chartState: state, activeViewId: null });
  },

  setActiveView: (id: string | null) => {
    set({ activeViewId: id });
  },

  toggleGuide: () => {
    set((state) => ({ showGuide: !state.showGuide }));
  },

  setShowGuide: (show: boolean) => {
    set({ showGuide: show });
  },
}));
