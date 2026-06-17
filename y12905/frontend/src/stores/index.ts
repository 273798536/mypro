import { create } from 'zustand';

interface CompareStore {
  versionA: number | null;
  versionB: number | null;
  currentCompareId: number | null;
  setVersionA: (n: number | null) => void;
  setVersionB: (n: number | null) => void;
  setCurrentCompare: (n: number | null) => void;
}

export const useCompareStore = create<CompareStore>((set) => ({
  versionA: null,
  versionB: null,
  currentCompareId: null,
  setVersionA: (n) => set({ versionA: n }),
  setVersionB: (n) => set({ versionB: n }),
  setCurrentCompare: (n) => set({ currentCompareId: n }),
}));

interface NavStore {
  active: 'compare' | 'statistics' | 'replay' | 'versions' | 'feedback';
  setActive: (a: NavStore['active']) => void;
}
export const useNav = create<NavStore>((set) => ({
  active: 'compare',
  setActive: (a) => set({ active: a }),
}));
