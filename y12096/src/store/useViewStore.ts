import { create } from 'zustand';
import type { SavedView } from '../types/params';
import type { RecordFilter } from '../types/records';

interface ViewStore {
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  savedViews: SavedView[];
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;

  setCameraPosition: (pos: [number, number, number]) => void;
  setCameraTarget: (target: [number, number, number]) => void;
  saveCurrentView: (name: string) => void;
  restoreView: (viewId: string) => void;
  deleteView: (viewId: string) => void;
  resetToDefault: () => void;
  syncWithFilter: (filter: RecordFilter) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  loadSavedViews: () => void;
}

const DEFAULT_POSITION: [number, number, number] = [4, 3, 4];
const DEFAULT_TARGET: [number, number, number] = [0, 0, 0];

function loadViews(): SavedView[] {
  try {
    const saved = localStorage.getItem('rotation_solid_views');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return [];
}

function saveViews(views: SavedView[]): void {
  localStorage.setItem('rotation_solid_views', JSON.stringify(views));
}

export const useViewStore = create<ViewStore>((set, get) => ({
  cameraPosition: DEFAULT_POSITION,
  cameraTarget: DEFAULT_TARGET,
  savedViews: loadViews(),
  leftPanelOpen: true,
  rightPanelOpen: true,

  setCameraPosition: (pos: [number, number, number]) => {
    set({ cameraPosition: pos });
  },

  setCameraTarget: (target: [number, number, number]) => {
    set({ cameraTarget: target });
  },

  saveCurrentView: (name: string): void => {
    const { cameraPosition, cameraTarget, savedViews } = get();
    const newView: SavedView = {
      id: `view-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      position: [...cameraPosition] as [number, number, number],
      target: [...cameraTarget] as [number, number, number],
      createdAt: new Date().toISOString(),
    };
    const newViews = [newView, ...savedViews];
    saveViews(newViews);
    set({ savedViews: newViews });
  },

  restoreView: (viewId: string): void => {
    const view = get().savedViews.find((v) => v.id === viewId);
    if (view) {
      set({
        cameraPosition: [...view.position] as [number, number, number],
        cameraTarget: [...view.target] as [number, number, number],
      });
    }
  },

  deleteView: (viewId: string): void => {
    set((state) => {
      const newViews = state.savedViews.filter((v) => v.id !== viewId);
      saveViews(newViews);
      return { savedViews: newViews };
    });
  },

  resetToDefault: (): void => {
    set({
      cameraPosition: DEFAULT_POSITION,
      cameraTarget: DEFAULT_TARGET,
    });
  },

  syncWithFilter: (filter: RecordFilter): void => {
    if (filter.axisFilter === 'x') {
      set({
        cameraPosition: [4, 2, 3],
        cameraTarget: [0, 0, 0],
      });
    } else if (filter.axisFilter === 'y') {
      set({
        cameraPosition: [3, 4, 2],
        cameraTarget: [0, 0, 0],
      });
    } else if (filter.axisFilter === 'custom') {
      set({
        cameraPosition: [5, 3, 3],
        cameraTarget: [0, 0, 0],
      });
    }
  },

  toggleLeftPanel: (): void => {
    set((state) => ({ leftPanelOpen: !state.leftPanelOpen }));
  },

  toggleRightPanel: (): void => {
    set((state) => ({ rightPanelOpen: !state.rightPanelOpen }));
  },

  loadSavedViews: (): void => {
    set({ savedViews: loadViews() });
  },
}));
