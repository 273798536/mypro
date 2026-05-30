import { create } from 'zustand';
import type { SamplingPoint, FunctionType, NoiseConfig, InterpolationResult, ExperimentSnapshot, ImportPhase } from '@/types';
import { computeInterpolation } from '@/utils/interpolation';

interface ExperimentState {
  points: SamplingPoint[];
  functionType: FunctionType;
  customExpr: string;
  noiseConfig: NoiseConfig | null;
  importPhase: ImportPhase;
  currentResult: InterpolationResult | null;
  previousResult: InterpolationResult | null;
  history: ExperimentSnapshot[];
  showComparison: boolean;

  setPoints: (points: SamplingPoint[]) => void;
  addPoint: (point: SamplingPoint) => void;
  removePoint: (index: number) => void;
  updatePoint: (index: number, point: SamplingPoint) => void;
  setFunctionType: (fn: FunctionType) => void;
  setCustomExpr: (expr: string) => void;
  setNoiseConfig: (config: NoiseConfig | null) => void;
  setImportPhase: (phase: ImportPhase) => void;
  recalculate: () => void;
  saveSnapshot: (label: string) => void;
  startComparison: () => void;
  clearComparison: () => void;
  loadExample: (type: 'duplicate_x' | 'boundary_oscillation' | 'noise_amplification', points: SamplingPoint[]) => void;
  reset: () => void;
}

export const useExperimentStore = create<ExperimentState>((set, get) => ({
  points: [],
  functionType: 'runge',
  customExpr: '',
  noiseConfig: null,
  importPhase: 1,
  currentResult: null,
  previousResult: null,
  history: [],
  showComparison: false,

  setPoints: (points) => {
    set({ points });
    get().recalculate();
  },

  addPoint: (point) => {
    set((state) => ({ points: [...state.points, point] }));
    get().recalculate();
  },

  removePoint: (index) => {
    set((state) => ({ points: state.points.filter((_, i) => i !== index) }));
    get().recalculate();
  },

  updatePoint: (index, point) => {
    set((state) => ({ points: state.points.map((p, i) => i === index ? point : p) }));
    get().recalculate();
  },

  setFunctionType: (fn) => {
    const state = get();
    if (state.currentResult) {
      set({ previousResult: state.currentResult, showComparison: true });
    }
    set({ functionType: fn });
    get().recalculate();
  },

  setCustomExpr: (expr) => {
    set({ customExpr: expr });
  },

  setNoiseConfig: (config) => {
    const state = get();
    if (state.currentResult && config && !state.noiseConfig) {
      set({ previousResult: state.currentResult, showComparison: true });
    }
    set({ noiseConfig: config });
    get().recalculate();
  },

  setImportPhase: (phase) => {
    set({ importPhase: phase });
  },

  recalculate: () => {
    const state = get();
    if (state.points.length === 0) {
      set({ currentResult: null });
      return;
    }
    const result = computeInterpolation(
      state.points,
      state.functionType,
      state.customExpr,
      state.noiseConfig
    );
    set({ currentResult: result });
  },

  saveSnapshot: (label) => {
    const state = get();
    if (!state.currentResult) return;
    const snapshot: ExperimentSnapshot = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: Date.now(),
      functionType: state.functionType,
      noiseConfig: state.noiseConfig ? { ...state.noiseConfig } : null,
      result: state.currentResult,
      label,
    };
    set((state) => ({ history: [...state.history, snapshot] }));
  },

  startComparison: () => {
    const state = get();
    if (state.currentResult) {
      set({ previousResult: state.currentResult, showComparison: true });
    }
  },

  clearComparison: () => {
    set({ previousResult: null, showComparison: false });
  },

  loadExample: (type, points) => {
    let fn: FunctionType = 'runge';
    let noise: NoiseConfig | null = null;

    switch (type) {
      case 'duplicate_x':
        fn = 'runge';
        break;
      case 'boundary_oscillation':
        fn = 'runge';
        break;
      case 'noise_amplification':
        fn = 'sin';
        noise = { type: 'gaussian', amplitude: 0.05, seed: 42 };
        break;
    }

    set({
      points,
      functionType: fn,
      noiseConfig: noise,
      importPhase: noise ? 2 : 1,
      currentResult: null,
      previousResult: null,
      showComparison: false,
    });

    const result = computeInterpolation(points, fn, '', noise);
    set({ currentResult: result });
  },

  reset: () => {
    set({
      points: [],
      functionType: 'runge',
      customExpr: '',
      noiseConfig: null,
      importPhase: 1,
      currentResult: null,
      previousResult: null,
      showComparison: false,
    });
  },
}));
