import { create } from 'zustand';
import type { ViewStoreState, ViewPreset } from '../types';

const STORAGE_KEY = 'loss-terrain-views';

const loadPresets = (): ViewPreset[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const savePresets = (presets: ViewPreset[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    console.warn('Failed to save view presets');
  }
};

export const useViewStore = create<ViewStoreState>((set, get) => ({
  viewPresets: loadPresets(),
  currentViewId: null,

  saveView: (name: string, position: [number, number, number], target: [number, number, number]) => {
    const newPreset: ViewPreset = {
      id: Math.random().toString(36).substring(2, 11),
      name,
      cameraPosition: position,
      cameraTarget: target,
      createdAt: Date.now()
    };
    
    const newPresets = [...get().viewPresets, newPreset];
    savePresets(newPresets);
    set({ viewPresets: newPresets });
  },

  restoreView: (id: string): ViewPreset | null => {
    const preset = get().viewPresets.find(p => p.id === id);
    if (preset) {
      set({ currentViewId: id });
    }
    return preset || null;
  },

  deleteView: (id: string) => {
    const newPresets = get().viewPresets.filter(p => p.id !== id);
    savePresets(newPresets);
    set({ 
      viewPresets: newPresets,
      currentViewId: get().currentViewId === id ? null : get().currentViewId
    });
  },

  exportScreenshot: () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `loss-terrain-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  }
}));
