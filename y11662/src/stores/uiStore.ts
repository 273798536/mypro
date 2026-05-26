import { create } from 'zustand';
import { UIState } from '../types';

export const useUIStore = create<UIState & {
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleAnomalyBar: () => void;
  setHoveredBar: (id: string | null) => void;
  setSelectedBar: (bar: { cashFlowId: string; screenPosition: { x: number; y: number } } | null) => void;
  setExporting: (isExporting: boolean) => void;
}>((set) => ({
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  anomalyBarVisible: true,
  hoveredBarId: null,
  selectedBar: null,
  isExporting: false,

  toggleLeftPanel: () => set((state) => ({ leftPanelCollapsed: !state.leftPanelCollapsed })),
  toggleRightPanel: () => set((state) => ({ rightPanelCollapsed: !state.rightPanelCollapsed })),
  toggleAnomalyBar: () => set((state) => ({ anomalyBarVisible: !state.anomalyBarVisible })),
  setHoveredBar: (id) => set({ hoveredBarId: id }),
  setSelectedBar: (bar) => set({ selectedBar: bar }),
  setExporting: (isExporting) => set({ isExporting }),
}));