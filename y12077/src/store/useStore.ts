import { create } from 'zustand';
import {
  Rack,
  Location,
  Sku,
  InOutRecord,
  HeatmapVersion,
  DataSource,
  Conflict,
  PathNode,
  HeatDimension,
} from '../types';
import {
  mockRack,
  mockLocationsWithSkus,
  mockSkus,
  mockInOutRecords,
  mockHeatmapVersions,
  mockDataSources,
  mockConflicts,
  mockPathNodes,
  calculateHeatmap,
} from '../data/mockData';

interface AppState {
  rack: Rack;
  locations: Location[];
  skus: Sku[];
  inOutRecords: InOutRecord[];
  heatmapVersions: HeatmapVersion[];
  dataSources: DataSource[];
  conflicts: Conflict[];
  pathNodes: PathNode[];
  selectedLocationId: string | null;
  selectedVersionId: string | null;
  selectedConflictId: string | null;
  heatDimension: HeatDimension;
  isPlaying: boolean;
  playbackSpeed: number;
  currentPathIndex: number;
  showLabels: boolean;
  showHeatmap: boolean;
  showConflicts: boolean;

  setSelectedLocationId: (id: string | null) => void;
  setSelectedVersionId: (id: string | null) => void;
  setSelectedConflictId: (id: string | null) => void;
  setHeatDimension: (dimension: HeatDimension) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setCurrentPathIndex: (index: number | ((prev: number) => number)) => void;
  setShowLabels: (show: boolean) => void;
  setShowHeatmap: (show: boolean) => void;
  setShowConflicts: (show: boolean) => void;

  lockVersion: (versionId: string) => void;
  unlockVersion: (versionId: string) => void;
  deleteVersion: (versionId: string) => void;
  createNewVersion: (name: string, remark: string) => void;
  resolveConflict: (conflictId: string) => void;
  unresolveConflict: (conflictId: string) => void;

  getSelectedLocation: () => Location | undefined;
  getSelectedVersion: () => HeatmapVersion | undefined;
  getSelectedConflict: () => Conflict | undefined;
  getLocationHeatMap: () => Map<string, number>;
  getHeatValueForLocation: (locationId: string) => number;
}

export const useStore = create<AppState>((set, get) => ({
  rack: mockRack,
  locations: mockLocationsWithSkus,
  skus: mockSkus,
  inOutRecords: mockInOutRecords,
  heatmapVersions: mockHeatmapVersions,
  dataSources: mockDataSources,
  conflicts: mockConflicts,
  pathNodes: mockPathNodes,
  selectedLocationId: null,
  selectedVersionId: mockHeatmapVersions[0].id,
  selectedConflictId: null,
  heatDimension: 'frequency',
  isPlaying: false,
  playbackSpeed: 1,
  currentPathIndex: 0,
  showLabels: true,
  showHeatmap: true,
  showConflicts: true,

  setSelectedLocationId: (id) => set({ selectedLocationId: id }),
  setSelectedVersionId: (id) => set({ selectedVersionId: id }),
  setSelectedConflictId: (id) => set({ selectedConflictId: id }),
  setHeatDimension: (dimension) => set({ heatDimension: dimension }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setCurrentPathIndex: (index) =>
    set((state) => ({
      currentPathIndex: typeof index === 'function' ? index(state.currentPathIndex) : index,
    })),
  setShowLabels: (show) => set({ showLabels: show }),
  setShowHeatmap: (show) => set({ showHeatmap: show }),
  setShowConflicts: (show) => set({ showConflicts: show }),

  lockVersion: (versionId) =>
    set((state) => ({
      heatmapVersions: state.heatmapVersions.map((v) =>
        v.id === versionId ? { ...v, isLocked: true } : v
      ),
    })),

  unlockVersion: (versionId) =>
    set((state) => ({
      heatmapVersions: state.heatmapVersions.map((v) =>
        v.id === versionId ? { ...v, isLocked: false } : v
      ),
    })),

  deleteVersion: (versionId) =>
    set((state) => {
      const version = state.heatmapVersions.find((v) => v.id === versionId);
      if (version?.isLocked) return state;
      return {
        heatmapVersions: state.heatmapVersions.filter((v) => v.id !== versionId),
        selectedVersionId:
          state.selectedVersionId === versionId
            ? state.heatmapVersions.find((v) => v.id !== versionId)?.id || null
            : state.selectedVersionId,
      };
    }),

  createNewVersion: (name, remark) =>
    set((state) => {
      const heatMap = calculateHeatmap(
        state.locations,
        state.inOutRecords,
        state.heatDimension,
        state.skus
      );
      const newVersion: HeatmapVersion = {
        id: `ver-${String(state.heatmapVersions.length + 1).padStart(3, '0')}`,
        name,
        remark,
        createdAt: new Date(),
        isLocked: false,
        createdBy: '当前用户',
        locationHeats: Array.from(heatMap.entries()).map(([locationId, heatValue]) => ({
          locationId,
          heatValue,
          heatDimension: state.heatDimension,
        })),
      };
      return {
        heatmapVersions: [...state.heatmapVersions, newVersion],
        selectedVersionId: newVersion.id,
      };
    }),

  resolveConflict: (conflictId) =>
    set((state) => ({
      conflicts: state.conflicts.map((c) =>
        c.id === conflictId ? { ...c, resolved: true } : c
      ),
    })),

  unresolveConflict: (conflictId) =>
    set((state) => ({
      conflicts: state.conflicts.map((c) =>
        c.id === conflictId ? { ...c, resolved: false } : c
      ),
    })),

  getSelectedLocation: () => {
    const state = get();
    return state.locations.find((l) => l.id === state.selectedLocationId);
  },

  getSelectedVersion: () => {
    const state = get();
    return state.heatmapVersions.find((v) => v.id === state.selectedVersionId);
  },

  getSelectedConflict: () => {
    const state = get();
    return state.conflicts.find((c) => c.id === state.selectedConflictId);
  },

  getLocationHeatMap: () => {
    const state = get();
    const selectedVersion = state.getSelectedVersion();
    if (!selectedVersion) {
      return calculateHeatmap(
        state.locations,
        state.inOutRecords,
        state.heatDimension,
        state.skus
      );
    }
    const map = new Map<string, number>();
    selectedVersion.locationHeats.forEach((h) => {
      map.set(h.locationId, h.heatValue);
    });
    return map;
  },

  getHeatValueForLocation: (locationId) => {
    const state = get();
    const heatMap = state.getLocationHeatMap();
    return heatMap.get(locationId) || 0;
  },
}));
