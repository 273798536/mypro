import { create } from 'zustand';
import type { MirrorSegment, IncidentRay, GradingResult } from '@/utils/types';
import { gradeAll } from '@/utils/geometry';

interface AppState {
  mirrors: MirrorSegment[];
  rays: IncidentRay[];
  results: GradingResult[];
  selectedResultId: string | null;
  isGraded: boolean;

  setMirrors: (mirrors: MirrorSegment[]) => void;
  setRays: (rays: IncidentRay[]) => void;
  runGrading: () => void;
  clearAll: () => void;
  selectResult: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  mirrors: [],
  rays: [],
  results: [],
  selectedResultId: null,
  isGraded: false,

  setMirrors: (mirrors) => set({ mirrors, isGraded: false, results: [] }),
  setRays: (rays) => set({ rays, isGraded: false, results: [] }),

  runGrading: () => {
    const { mirrors, rays } = get();
    if (mirrors.length === 0 || rays.length === 0) return;
    const results = gradeAll(rays, mirrors);
    set({ results, isGraded: true, selectedResultId: results.length > 0 ? results[0].id : null });
  },

  clearAll: () =>
    set({
      mirrors: [],
      rays: [],
      results: [],
      selectedResultId: null,
      isGraded: false,
    }),

  selectResult: (id) => set({ selectedResultId: id }),
}));
