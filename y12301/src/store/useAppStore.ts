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

const REMARKS_STORAGE_KEY = 'wind-corridor-building-remarks';

function loadPersistedRemarks(): Record<string, string> {
  try {
    const raw = localStorage.getItem(REMARKS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistRemarks(remarks: Record<string, string>) {
  try {
    localStorage.setItem(REMARKS_STORAGE_KEY, JSON.stringify(remarks));
  } catch {}
}

function applyPersistedRemarks(buildings: BuildingBlock[]): BuildingBlock[] {
  const persisted = loadPersistedRemarks();
  return buildings.map((b) =>
    persisted[b.id] !== undefined ? { ...b, remarks: persisted[b.id] } : b
  );
}

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
  saveRemarksToStorage: () => void;
  exportReport: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  buildings: applyPersistedRemarks(mockBuildings),
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

  saveRemarksToStorage: () => {
    const { buildings } = get();
    const remarksMap: Record<string, string> = {};
    buildings.forEach((b) => {
      if (b.remarks) {
        remarksMap[b.id] = b.remarks;
      }
    });
    persistRemarks(remarksMap);
  },

  exportReport: () => {
    const { buildings, anomalies, windData, timePeriod, openSpaces } = get();

    const unresolvedErrors = anomalies.filter((a) => !a.resolved && a.severity === 'error');
    const unresolvedWarnings = anomalies.filter((a) => !a.resolved && a.severity === 'warning');
    const resolvedItems = anomalies.filter((a) => a.resolved);

    const report = {
      exportTime: new Date().toISOString(),
      timePeriod,
      summary: {
        totalBuildings: buildings.length,
        totalAnomalies: anomalies.length,
        errorCount: unresolvedErrors.length,
        warningCount: unresolvedWarnings.length,
        resolvedCount: resolvedItems.length,
      },
      buildings: buildings.map((b) => ({
        id: b.id,
        name: b.name,
        position: b.position,
        dimensions: b.dimensions,
        setbackDistance: b.setbackDistance,
        requiredSetback: b.requiredSetback,
        status: b.status,
        remarks: b.remarks || '',
      })),
      windData: windData[timePeriod],
      openSpaces: openSpaces.map((s) => ({
        id: s.id,
        name: s.name,
        position: s.position,
        area: s.area,
        type: s.type,
      })),
      anomalies: anomalies.map((a) => ({
        id: a.id,
        type: a.type,
        severity: a.severity,
        reason: a.reason,
        suggestion: a.suggestion,
        relatedEntities: a.relatedEntities,
        resolved: a.resolved,
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wind-corridor-report-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
}));
