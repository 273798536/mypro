import { create } from 'zustand';
import type { SurfaceConfig, ExtremumPoint, CrossSection, CrossSectionDirection, ViewpointSnapshot, SurfaceData, ParseError } from '@/types';
import { sampleSurface, detectExtrema, computeCrossSection, getDefaultConfig } from '@/utils/mathEngine';

interface SurfaceState {
  config: SurfaceConfig;
  surfaceData: SurfaceData | null;
  extrema: ExtremumPoint[];
  crossSection: CrossSection | null;
  crossSectionDirection: CrossSectionDirection;
  crossSectionPosition: number;
  parseError: ParseError | null;
  viewpoints: ViewpointSnapshot[];
  showCrossSection: boolean;
  isComputing: boolean;

  setExpression: (expr: string) => void;
  setXRange: (range: [number, number]) => void;
  setYRange: (range: [number, number]) => void;
  setZRange: (range: [number, number]) => void;
  setSamplingDensity: (density: number) => void;
  setConfig: (config: SurfaceConfig) => void;
  setCrossSectionDirection: (dir: CrossSectionDirection) => void;
  setCrossSectionPosition: (pos: number) => void;
  toggleCrossSection: () => void;
  recompute: () => void;
  recomputeCrossSection: () => void;
  saveViewpoint: (name: string, position: [number, number, number], target: [number, number, number], up: [number, number, number], zoom: number) => void;
  deleteViewpoint: (id: string) => void;
  loadViewpoints: () => void;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return fallback;
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const useSurfaceStore = create<SurfaceState>((set, get) => ({
  config: loadFromStorage('surface-explorer-last-config', getDefaultConfig()),
  surfaceData: null,
  extrema: [],
  crossSection: null,
  crossSectionDirection: 'xz',
  crossSectionPosition: 0,
  parseError: null,
  viewpoints: [],
  showCrossSection: false,
  isComputing: false,

  setExpression: (expr) => {
    set((s) => ({ config: { ...s.config, expression: expr } }));
  },
  setXRange: (range) => {
    set((s) => ({ config: { ...s.config, xRange: range } }));
  },
  setYRange: (range) => {
    set((s) => ({ config: { ...s.config, yRange: range } }));
  },
  setZRange: (range) => {
    set((s) => ({ config: { ...s.config, zRange: range } }));
  },
  setSamplingDensity: (density) => {
    set((s) => ({ config: { ...s.config, samplingDensity: density } }));
  },
  setConfig: (config) => {
    set({ config });
  },
  setCrossSectionDirection: (dir) => {
    set({ crossSectionDirection: dir });
  },
  setCrossSectionPosition: (pos) => {
    set({ crossSectionPosition: pos });
  },
  toggleCrossSection: () => {
    set((s) => ({ showCrossSection: !s.showCrossSection }));
  },
  recompute: () => {
    const { config, crossSectionDirection, crossSectionPosition, showCrossSection } = get();
    set({ isComputing: true });

    saveToStorage('surface-explorer-last-config', config);

    const result = sampleSurface(config);
    if (result.parseError) {
      set({ surfaceData: null, extrema: [], parseError: result.parseError, isComputing: false, crossSection: null });
      return;
    }

    const extResult = detectExtrema(config);
    const extrema = Array.isArray(extResult) ? extResult : [];

    let crossSection: CrossSection | null = null;
    if (showCrossSection) {
      const csResult = computeCrossSection(config, crossSectionDirection, crossSectionPosition);
      crossSection = 'message' in csResult ? null : csResult;
    }

    set({ surfaceData: result.data, extrema, parseError: null, crossSection, isComputing: false });
  },
  recomputeCrossSection: () => {
    const { config, crossSectionDirection, crossSectionPosition, showCrossSection } = get();
    if (!showCrossSection) return;

    const csResult = computeCrossSection(config, crossSectionDirection, crossSectionPosition);
    const crossSection = 'message' in csResult ? null : csResult;
    set({ crossSection });
  },
  saveViewpoint: (name, position, target, up, zoom) => {
    const vp: ViewpointSnapshot = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      position,
      target,
      up,
      zoom,
      timestamp: Date.now(),
      config: { ...get().config },
    };
    const viewpoints = [...get().viewpoints, vp];
    set({ viewpoints });
    saveToStorage('surface-explorer-viewpoints', viewpoints);
  },
  deleteViewpoint: (id) => {
    const viewpoints = get().viewpoints.filter((v) => v.id !== id);
    set({ viewpoints });
    saveToStorage('surface-explorer-viewpoints', viewpoints);
  },
  loadViewpoints: () => {
    const viewpoints = loadFromStorage<ViewpointSnapshot[]>('surface-explorer-viewpoints', []);
    set({ viewpoints });
  },
}));
