import { create } from 'zustand';
import type { ViewMode, FrequencyBand } from '@/types';

interface ViewState {
  viewMode: ViewMode;
  activeBand: FrequencyBand;
  anomalyPanelOpen: boolean;
  correctionPanelOpen: boolean;
  isFullscreen: boolean;
  setViewMode: (mode: ViewMode) => void;
  setActiveBand: (band: FrequencyBand) => void;
  toggleAnomalyPanel: () => void;
  toggleCorrectionPanel: () => void;
  setFullscreen: (on: boolean) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  viewMode: '2d',
  activeBand: '1000',
  anomalyPanelOpen: true,
  correctionPanelOpen: false,
  isFullscreen: false,
  setViewMode: (mode) => set({ viewMode: mode }),
  setActiveBand: (band) => set({ activeBand: band }),
  toggleAnomalyPanel: () => set((s) => ({ anomalyPanelOpen: !s.anomalyPanelOpen })),
  toggleCorrectionPanel: () => set((s) => ({ correctionPanelOpen: !s.correctionPanelOpen })),
  setFullscreen: (on) => set({ isFullscreen: on }),
}));
