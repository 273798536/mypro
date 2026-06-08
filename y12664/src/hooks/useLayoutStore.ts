import { create } from 'zustand';
import type { Cage, CameraView, LayoutConfig, SampleType, ValidationIssue } from '@/types';
import { defaultConfig, generateCages, sampleData } from '@/utils/sampleData';

interface LayoutState {
  config: LayoutConfig;
  cages: Cage[];
  issues: ValidationIssue[];
  cameraViews: CameraView[];
  selectedCageId: string | null;
  setConfig: (cfg: Partial<LayoutConfig>) => void;
  setCages: (cages: Cage[]) => void;
  updateCage: (id: string, patch: Partial<Cage>) => void;
  regenerateCages: () => void;
  loadSample: (type: SampleType) => void;
  addIssue: (issue: ValidationIssue) => void;
  setIssues: (issues: ValidationIssue[]) => void;
  saveCameraView: (name: string, position: CameraView['position'], target: CameraView['target']) => void;
  removeCameraView: (id: string) => void;
  selectCage: (id: string | null) => void;
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  config: defaultConfig,
  cages: generateCages(defaultConfig),
  issues: [],
  cameraViews: [],
  selectedCageId: null,

  setConfig: (cfg) => {
    const next = { ...get().config, ...cfg };
    set({ config: next });
  },

  setCages: (cages) => set({ cages }),

  updateCage: (id, patch) => {
    const cages = get().cages.map((c) => (c.id === id ? { ...c, ...patch } : c));
    set({ cages });
  },

  regenerateCages: () => {
    const cages = generateCages(get().config);
    set({ cages });
  },

  loadSample: (type) => {
    const data = sampleData[type];
    set({
      config: { ...data.config },
      cages: data.cages.map((c) => ({ ...c })),
      selectedCageId: null,
    });
  },

  addIssue: (issue) => {
    const exists = get().issues.some(
      (i) => i.type === issue.type && i.cageId === issue.cageId,
    );
    if (!exists) set({ issues: [...get().issues, issue] });
  },

  setIssues: (issues) => set({ issues }),

  saveCameraView: (name, position, target) => {
    const view: CameraView = {
      id: Math.random().toString(36).slice(2, 10),
      name,
      position: { ...position },
      target: { ...target },
      savedAt: Date.now(),
    };
    set({ cameraViews: [...get().cameraViews, view] });
  },

  removeCameraView: (id) => {
    set({ cameraViews: get().cameraViews.filter((v) => v.id !== id) });
  },

  selectCage: (id) => set({ selectedCageId: id }),
}));
