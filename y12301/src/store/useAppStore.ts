import { create } from 'zustand';
import {
  BuildingBlock,
  WindDirection,
  OpenSpace,
  AnomalyItem,
  LayerState,
  TimePeriod,
} from '../types';
import { mockBuildings, mockWindData, mockOpenSpaces } from '../data/mockData';
import { detectOverlaps } from '../engine/overlapDetector';
import { detectSetbackErrors } from '../engine/setbackDetector';
import { detectWindGaps } from '../engine/windGapDetector';

interface AppState {
  buildings: BuildingBlock[];
  windData: Record<TimePeriod, WindDirection[]>;
  openSpaces: OpenSpace[];
  anomalies: AnomalyItem[];
  selectedEntity: string | null;
  focusedAnomaly: string | null;
  timePeriod: TimePeriod;
  isPlaying: boolean;
  layers: LayerState;
  buildingOpacity: number;

  setBuildings: (buildings: BuildingBlock[]) => void;
  updateBuilding: (id: string, updates: Partial<BuildingBlock>) => void;
  addBuilding: (building: BuildingBlock) => void;
  removeBuilding: (id: string) => void;

  setSelectedEntity: (id: string | null) => void;
  setFocusedAnomaly: (id: string | null) => void;

  setTimePeriod: (period: TimePeriod) => void;
  setIsPlaying: (playing: boolean) => void;

  setLayerVisible: (layer: keyof LayerState, visible: boolean) => void;
  setBuildingOpacity: (opacity: number) => void;

  updateOpenSpace: (id: string, updates: Partial<OpenSpace>) => void;

  runAnomalyDetection: () => void;
  resolveAnomaly: (id: string) => void;
  unresolveAnomaly: (id: string) => void;

  addBuildingRemark: (buildingId: string, remark: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  buildings: mockBuildings,
  windData: mockWindData,
  openSpaces: mockOpenSpaces,
  anomalies: [],
  selectedEntity: null,
  focusedAnomaly: null,
  timePeriod: 'morning',
  isPlaying: false,
  layers: {
    buildings: true,
    windCorridors: true,
    openSpaces: true,
    windRose: true,
  },
  buildingOpacity: 0.85,

  setBuildings: (buildings) => {
    set({ buildings });
    get().runAnomalyDetection();
  },

  updateBuilding: (id, updates) => {
    set((state) => ({
      buildings: state.buildings.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    }));
    get().runAnomalyDetection();
  },

  addBuilding: (building) => {
    set((state) => ({
      buildings: [...state.buildings, building],
    }));
    get().runAnomalyDetection();
  },

  removeBuilding: (id) => {
    set((state) => ({
      buildings: state.buildings.filter((b) => b.id !== id),
    }));
    get().runAnomalyDetection();
  },

  setSelectedEntity: (id) => set({ selectedEntity: id }),
  setFocusedAnomaly: (id) => set({ focusedAnomaly: id }),

  setTimePeriod: (period) => {
    set({ timePeriod: period });
    get().runAnomalyDetection();
  },

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  setLayerVisible: (layer, visible) => {
    set((state) => ({
      layers: { ...state.layers, [layer]: visible },
    }));
  },

  setBuildingOpacity: (opacity) => set({ buildingOpacity: opacity }),

  updateOpenSpace: (id, updates) => {
    set((state) => ({
      openSpaces: state.openSpaces.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
  },

  runAnomalyDetection: () => {
    const { buildings, windData, timePeriod } = get();

    const overlapAnomalies = detectOverlaps(buildings);
    const setbackAnomalies = detectSetbackErrors(buildings);
    const windGapAnomalies = detectWindGaps(buildings, windData[timePeriod]);

    const allAnomalies = [
      ...overlapAnomalies,
      ...setbackAnomalies,
      ...windGapAnomalies,
    ];

    set({ anomalies: allAnomalies });

    const anomalyBuildingIds = new Set<string>();
    allAnomalies.forEach((a) => {
      a.relatedEntities.forEach((id) => anomalyBuildingIds.add(id));
    });

    set((state) => ({
      buildings: state.buildings.map((b) => ({
        ...b,
        status: anomalyBuildingIds.has(b.id) ? 'anomaly' : b.status === 'pending' ? 'pending' : 'normal',
      })),
    }));
  },

  resolveAnomaly: (id) => {
    set((state) => ({
      anomalies: state.anomalies.map((a) =>
        a.id === id ? { ...a, resolved: true } : a
      ),
    }));
  },

  unresolveAnomaly: (id) => {
    set((state) => ({
      anomalies: state.anomalies.map((a) =>
        a.id === id ? { ...a, resolved: false } : a
      ),
    }));
  },

  addBuildingRemark: (buildingId, remark) => {
    set((state) => ({
      buildings: state.buildings.map((b) =>
        b.id === buildingId ? { ...b, remarks: remark } : b
      ),
    }));
  },
}));
