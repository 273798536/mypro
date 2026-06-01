import { create } from 'zustand';
import { ValidationIssue, DataSource } from '@/data/museum-data';

interface MuseumStore {
  selectedFloor: string | null;
  selectedHall: string | null;
  selectedStairway: string | null;
  selectedTimeRange: [number, number];
  heatmapOpacity: number;
  sidebarTab: 'heatmap' | 'route';
  playingRouteId: string | null;
  routePlaybackSpeed: number;
  routePlaybackProgress: number;
  validationIssues: ValidationIssue[];
  dataSources: DataSource[];
  showReportModal: boolean;
  showDetailPanel: boolean;
  sidebarCollapsed: boolean;

  setSelectedFloor: (floorId: string | null) => void;
  setSelectedHall: (hallId: string | null) => void;
  setSelectedStairway: (stairwayId: string | null) => void;
  setSelectedTimeRange: (range: [number, number]) => void;
  setHeatmapOpacity: (opacity: number) => void;
  setSidebarTab: (tab: 'heatmap' | 'route') => void;
  setPlayingRouteId: (routeId: string | null) => void;
  setRoutePlaybackSpeed: (speed: number) => void;
  setRoutePlaybackProgress: (progress: number) => void;
  setValidationIssues: (issues: ValidationIssue[]) => void;
  setDataSources: (sources: DataSource[]) => void;
  setShowReportModal: (show: boolean) => void;
  setShowDetailPanel: (show: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useMuseumStore = create<MuseumStore>((set) => ({
  selectedFloor: 'F1',
  selectedHall: null,
  selectedStairway: null,
  selectedTimeRange: [9 * 3600, 11 * 3600],
  heatmapOpacity: 0.7,
  sidebarTab: 'heatmap',
  playingRouteId: null,
  routePlaybackSpeed: 1,
  routePlaybackProgress: 0,
  validationIssues: [],
  dataSources: [],
  showReportModal: false,
  showDetailPanel: false,
  sidebarCollapsed: false,

  setSelectedFloor: (floorId) => set({ selectedFloor: floorId }),
  setSelectedHall: (hallId) => set({ selectedHall: hallId, showDetailPanel: hallId !== null }),
  setSelectedStairway: (stairwayId) => set({ selectedStairway: stairwayId, showDetailPanel: stairwayId !== null }),
  setSelectedTimeRange: (range) => set({ selectedTimeRange: range }),
  setHeatmapOpacity: (opacity) => set({ heatmapOpacity: opacity }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setPlayingRouteId: (routeId) => set({ playingRouteId: routeId, routePlaybackProgress: 0 }),
  setRoutePlaybackSpeed: (speed) => set({ routePlaybackSpeed: speed }),
  setRoutePlaybackProgress: (progress) => set({ routePlaybackProgress: progress }),
  setValidationIssues: (issues) => set({ validationIssues: issues }),
  setDataSources: (sources) => set({ dataSources: sources }),
  setShowReportModal: (show) => set({ showReportModal: show }),
  setShowDetailPanel: (show) => set({ showDetailPanel: show }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
