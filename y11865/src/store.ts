import { create } from 'zustand';
import type {
  FireStation,
  Building,
  RoadNode,
  RoadEdge,
  CoverageResult,
  Alert,
  Simulation,
  SimulationComparison,
  TimePoint,
} from './types';

interface AppState {
  currentSimulation: Simulation | null;
  comparisonSimulation: Simulation | null;
  simulationHistory: Simulation[];
  comparison: SimulationComparison | null;
  selectedBuildingId: string | null;
  selectedFireStationId: string | null;
  currentTimeIndex: number;
  timePoints: TimePoint[];
  isPlaying: boolean;
  alerts: Alert[];
  isCalculating: boolean;
  viewMode: 'single' | 'comparison' | 'difference';

  setCurrentSimulation: (sim: Simulation | null) => void;
  setComparisonSimulation: (sim: Simulation | null) => void;
  setSimulationHistory: (history: Simulation[]) => void;
  addSimulationToHistory: (sim: Simulation) => void;
  setComparison: (comp: SimulationComparison | null) => void;
  setSelectedBuildingId: (id: string | null) => void;
  setSelectedFireStationId: (id: string | null) => void;
  setCurrentTimeIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp'>) => void;
  clearAlerts: () => void;
  setIsCalculating: (calc: boolean) => void;
  setViewMode: (mode: 'single' | 'comparison' | 'difference') => void;
  updateParameters: (params: Partial<Simulation['parameters']>) => void;
  addFireStation: (station: FireStation) => void;
  removeFireStation: (id: string) => void;
  updateFireStation: (id: string, updates: Partial<FireStation>) => void;
  setResults: (results: CoverageResult[]) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const defaultTimePoints: TimePoint[] = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  speedMultiplier: i >= 7 && i <= 9 ? 0.6 : i >= 17 && i <= 19 ? 0.5 : 1.0,
  trafficVolume: i >= 7 && i <= 9 ? 0.9 : i >= 17 && i <= 19 ? 0.95 : 0.4,
}));

export const useAppStore = create<AppState>((set, get) => ({
  currentSimulation: null,
  comparisonSimulation: null,
  simulationHistory: [],
  comparison: null,
  selectedBuildingId: null,
  selectedFireStationId: null,
  currentTimeIndex: 12,
  timePoints: defaultTimePoints,
  isPlaying: false,
  alerts: [],
  isCalculating: false,
  viewMode: 'single',

  setCurrentSimulation: (sim) => set({ currentSimulation: sim }),
  setComparisonSimulation: (sim) => set({ comparisonSimulation: sim }),
  setSimulationHistory: (history) => set({ simulationHistory: history }),

  addSimulationToHistory: (sim) =>
    set((state) => {
      const exists = state.simulationHistory.some((s) => s.id === sim.id);
      if (exists) {
        return {
          simulationHistory: state.simulationHistory.map((s) =>
            s.id === sim.id ? sim : s
          ),
        };
      }
      return { simulationHistory: [...state.simulationHistory, sim] };
    }),

  setComparison: (comp) => set({ comparison: comp }),
  setSelectedBuildingId: (id) => set({ selectedBuildingId: id }),
  setSelectedFireStationId: (id) => set({ selectedFireStationId: id }),
  setCurrentTimeIndex: (index) => set({ currentTimeIndex: index }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  addAlert: (alert) =>
    set((state) => ({
      alerts: [
        ...state.alerts,
        {
          ...alert,
          id: generateId(),
          timestamp: Date.now(),
        },
      ],
    })),

  clearAlerts: () => set({ alerts: [] }),
  setIsCalculating: (calc) => set({ isCalculating: calc }),
  setViewMode: (mode) => set({ viewMode: mode }),

  updateParameters: (params) =>
    set((state) => {
      if (!state.currentSimulation) return {};
      return {
        currentSimulation: {
          ...state.currentSimulation,
          parameters: {
            ...state.currentSimulation.parameters,
            ...params,
          },
        },
      };
    }),

  addFireStation: (station) =>
    set((state) => {
      if (!state.currentSimulation) return {};
      return {
        currentSimulation: {
          ...state.currentSimulation,
          fireStations: [...state.currentSimulation.fireStations, station],
        },
      };
    }),

  removeFireStation: (id) =>
    set((state) => {
      if (!state.currentSimulation) return {};
      return {
        currentSimulation: {
          ...state.currentSimulation,
          fireStations: state.currentSimulation.fireStations.filter(
            (s) => s.id !== id
          ),
        },
      };
    }),

  updateFireStation: (id, updates) =>
    set((state) => {
      if (!state.currentSimulation) return {};
      return {
        currentSimulation: {
          ...state.currentSimulation,
          fireStations: state.currentSimulation.fireStations.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        },
      };
    }),

  setResults: (results) =>
    set((state) => {
      if (!state.currentSimulation) return {};
      return {
        currentSimulation: {
          ...state.currentSimulation,
          results,
        },
      };
    }),
}));
