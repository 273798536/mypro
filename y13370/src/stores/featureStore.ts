import { create } from 'zustand';
import type { LateFeature } from '@/types';
import { mockLateFeatures } from '@/data/sampleData';

interface FeatureState {
  features: LateFeature[];
  onlyMixedIn: boolean;
  riskFilter: Array<'high' | 'medium' | 'low'>;
  init: () => void;
  setOnlyMixedIn: (v: boolean) => void;
  setRiskFilter: (r: Array<'high' | 'medium' | 'low'>) => void;
  getFiltered: () => LateFeature[];
  getHighRiskCount: () => number;
  getMixedCount: () => number;
}

export const useFeatureStore = create<FeatureState>((set, get) => ({
  features: [],
  onlyMixedIn: false,
  riskFilter: [],
  init: () => {
    if (get().features.length > 0) return;
    set({ features: [...mockLateFeatures] });
  },
  setOnlyMixedIn: (v) => set({ onlyMixedIn: v }),
  setRiskFilter: (r) => set({ riskFilter: r }),
  getFiltered: () => {
    const { features, onlyMixedIn, riskFilter } = get();
    let f = [...features];
    if (onlyMixedIn) f = f.filter(x => x.mixedInNormal);
    if (riskFilter.length > 0) f = f.filter(x => riskFilter.includes(x.riskLevel));
    return f.sort((a, b) => new Date(b.occurTime).getTime() - new Date(a.occurTime).getTime());
  },
  getHighRiskCount: () => get().features.filter(f => f.riskLevel === 'high').length,
  getMixedCount: () => get().features.filter(f => f.mixedInNormal).length
}));
