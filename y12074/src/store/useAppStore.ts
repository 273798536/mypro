import { create } from 'zustand';
import type {
  AppState,
  LuggageRecord,
  ChuteModel,
  SortingPort,
  AnomalyEvent,
  BadRow,
  AnomalyFilters,
  AnomalyType,
  SimulationState,
} from '@/types';

interface AppStore extends AppState, SimulationState {
  selectedAnomalyId: string | null;
  setLuggageData: (data: LuggageRecord[]) => void;
  setChuteModels: (models: ChuteModel[]) => void;
  setSortingPorts: (ports: SortingPort[]) => void;
  setAnomalies: (anomalies: AnomalyEvent[]) => void;
  setBadRows: (rows: BadRow[]) => void;
  setActiveTab: (tab: string) => void;
  setDataLoaded: (loaded: boolean) => void;
  setAnomalyFilters: (filters: Partial<AnomalyFilters>) => void;
  toggleAnomalyType: (type: AnomalyType) => void;
  markAnomalyReviewed: (id: string, reviewed: boolean) => void;
  clearData: () => void;
  setSimulationTime: (time: number | ((prev: number) => number)) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setSelectedChuteId: (id: string | null) => void;
  setSelectedLuggageId: (id: string | null) => void;
  setSelectedAnomalyId: (id: string | null) => void;
  setShowLabels: (show: boolean) => void;
  setShowPath: (show: boolean) => void;
}

const initialState: AppState & SimulationState & { selectedAnomalyId: string | null } = {
  luggageData: [],
  chuteModels: [],
  sortingPorts: [],
  anomalies: [],
  badRows: [],
  activeTab: 'simulation',
  anomalyFilters: {
    types: ['height_mismatch', 'speed_over', 'stacked'],
  },
  isDataLoaded: false,
  simulationTime: 0,
  isPlaying: false,
  playbackSpeed: 1,
  selectedChuteId: null,
  selectedLuggageId: null,
  selectedAnomalyId: null,
  showLabels: true,
  showPath: true,
};

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialState,

  setLuggageData: (data) => set({ luggageData: data }),
  setChuteModels: (models) => set({ chuteModels: models }),
  setSortingPorts: (ports) => set({ sortingPorts: ports }),
  setAnomalies: (anomalies) => set({ anomalies }),
  setBadRows: (rows) => set({ badRows: rows }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setDataLoaded: (loaded) => set({ isDataLoaded: loaded }),

  setAnomalyFilters: (filters) =>
    set((state) => ({
      anomalyFilters: { ...state.anomalyFilters, ...filters },
    })),

  toggleAnomalyType: (type) =>
    set((state) => {
      const types = state.anomalyFilters.types;
      const newTypes = types.includes(type)
        ? types.filter((t) => t !== type)
        : [...types, type];
      return {
        anomalyFilters: { ...state.anomalyFilters, types: newTypes },
      };
    }),

  markAnomalyReviewed: (id, reviewed) =>
    set((state) => ({
      anomalies: state.anomalies.map((a) =>
        a.id === id ? { ...a, reviewed } : a
      ),
    })),

  clearData: () =>
    set({
      luggageData: [],
      anomalies: [],
      badRows: [],
      isDataLoaded: false,
      simulationTime: 0,
      isPlaying: false,
      selectedLuggageId: null,
    }),

  setSimulationTime: (time) =>
    set((state) => ({
      simulationTime: typeof time === 'function' ? time(state.simulationTime) : time,
    })),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setSelectedChuteId: (id) => set({ selectedChuteId: id }),
  setSelectedLuggageId: (id) => set({ selectedLuggageId: id }),
  setSelectedAnomalyId: (id) => set({ selectedAnomalyId: id }),
  setShowLabels: (show) => set({ showLabels: show }),
  setShowPath: (show) => set({ showPath: show }),

  getFilteredAnomalies: () => {
    const state = get();
    return state.anomalies.filter((a) => {
      if (!state.anomalyFilters.types.includes(a.type)) return false;
      if (state.anomalyFilters.reviewed !== undefined && a.reviewed !== state.anomalyFilters.reviewed) return false;
      if (state.anomalyFilters.chuteId && a.chuteId !== state.anomalyFilters.chuteId) return false;
      if (state.anomalyFilters.severity && !state.anomalyFilters.severity.includes(a.severity)) return false;
      return true;
    });
  },
}));
