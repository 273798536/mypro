import { create } from 'zustand';
import type { ViewPreset, ViewCondition } from '@/types';
import { getStorage, setStorage, generateId } from '@/utils/storage';
import { mockViewPresets } from '@/data/mockData';

interface PresetState {
  presets: ViewPreset[];
  loadPresets: () => void;
  savePreset: (name: string, viewCondition: ViewCondition, createdBy: string) => void;
  deletePreset: (id: string) => void;
  getPresetById: (id: string) => ViewPreset | undefined;
}

const STORAGE_KEY = 'view_presets';
const INIT_FLAG = 'presets_initialized';

export const usePresetStore = create<PresetState>((set, get) => ({
  presets: [],

  loadPresets: () => {
    const initialized = getStorage(INIT_FLAG, false);
    if (!initialized) {
      setStorage(STORAGE_KEY, mockViewPresets);
      setStorage(INIT_FLAG, true);
      set({ presets: mockViewPresets });
    } else {
      const presets = getStorage<ViewPreset[]>(STORAGE_KEY, mockViewPresets);
      set({ presets });
    }
  },

  savePreset: (name, viewCondition, createdBy) => {
    const { presets } = get();
    
    const newPreset: ViewPreset = {
      id: generateId(),
      name,
      viewCondition: JSON.parse(JSON.stringify(viewCondition)),
      createdBy,
      createdAt: new Date().toISOString(),
    };

    const updatedPresets = [...presets, newPreset];
    setStorage(STORAGE_KEY, updatedPresets);
    set({ presets: updatedPresets });
  },

  deletePreset: (id) => {
    const { presets } = get();
    const updatedPresets = presets.filter(p => p.id !== id);
    setStorage(STORAGE_KEY, updatedPresets);
    set({ presets: updatedPresets });
  },

  getPresetById: (id) => {
    return get().presets.find(p => p.id === id);
  },
}));
