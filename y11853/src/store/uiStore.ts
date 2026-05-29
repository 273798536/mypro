import { create } from 'zustand';
import type { UIState, RunType } from '../types/analysis';
import { generateRiskThresholds } from '../utils/mock';

interface UIStore extends UIState {
  setSelectedAssetId: (id: string | null) => void;
  setHoveredAssetId: (id: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTimeIndex: (index: number) => void;
  setViewMode: (mode: '3d' | 'comparison') => void;
  setShowAxes: (show: boolean) => void;
  setShowGrid: (show: boolean) => void;
  setHighlightRisk: (level: 'all' | 'low' | 'medium' | 'high') => void;
  setSelectedIndustries: (industries: string[]) => void;
  toggleIndustry: (industry: string) => void;
  setRiskThresholds: (thresholds: { low: number; medium: number }) => void;
  setActiveRun: (run: RunType | 'comparison') => void;
  togglePlay: () => void;
  resetView: () => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  selectedAssetId: null,
  hoveredAssetId: null,
  isPlaying: false,
  currentTimeIndex: 23,
  viewMode: '3d',
  showAxes: true,
  showGrid: true,
  highlightRisk: 'all',
  selectedIndustries: [],
  riskThresholds: generateRiskThresholds(),
  activeRun: 'first',
  
  setSelectedAssetId: (id) => set({ selectedAssetId: id }),
  setHoveredAssetId: (id) => set({ hoveredAssetId: id }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTimeIndex: (index) => set({ currentTimeIndex: index }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setShowAxes: (show) => set({ showAxes: show }),
  setShowGrid: (show) => set({ showGrid: show }),
  setHighlightRisk: (level) => set({ highlightRisk: level }),
  setSelectedIndustries: (industries) => set({ selectedIndustries: industries }),
  toggleIndustry: (industry) => {
    const current = get().selectedIndustries;
    const next = current.includes(industry)
      ? current.filter(i => i !== industry)
      : [...current, industry];
    set({ selectedIndustries: next });
  },
  setRiskThresholds: (thresholds) => set({ riskThresholds: thresholds }),
  setActiveRun: (run) => set({ activeRun: run }),
  togglePlay: () => set({ isPlaying: !get().isPlaying }),
  resetView: () => set({
    selectedAssetId: null,
    hoveredAssetId: null,
    isPlaying: false,
    currentTimeIndex: 23,
    showAxes: true,
    showGrid: true,
    highlightRisk: 'all',
  }),
}));
