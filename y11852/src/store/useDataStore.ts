import { create } from 'zustand';
import type {
  HallModel,
  SoundSource,
  Seat,
  SoundRay,
  Material,
  FrequencyBand,
  IssueType,
  FilterState,
  ValidationResult,
  ImportMeta,
  HeatMapMetric,
} from '../types/acoustics';
import materialsData from '../data/materials.json';

interface DataState {
  hallModel: HallModel | null;
  soundSources: SoundSource[];
  seats: Seat[];
  soundRays: SoundRay[];
  materials: Material[];
  importHistory: ImportMeta[];
  validationResult: ValidationResult | null;
  filters: FilterState;
  heatMapMetric: HeatMapMetric;
  activeFrequencyBand: FrequencyBand;
  isCalculating: boolean;
  calculationProgress: number;
  setHallModel: (model: HallModel | null) => void;
  setSoundSources: (sources: SoundSource[]) => void;
  setSeats: (seats: Seat[]) => void;
  setSoundRays: (rays: SoundRay[]) => void;
  addImportRecord: (meta: ImportMeta) => void;
  setValidationResult: (result: ValidationResult | null) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  setHeatMapMetric: (metric: HeatMapMetric) => void;
  setActiveFrequencyBand: (band: FrequencyBand) => void;
  toggleFrequencyBand: (band: FrequencyBand) => void;
  toggleIssueType: (type: IssueType) => void;
  setSelectedSeatIds: (ids: string[]) => void;
  setShowOnlyIssues: (show: boolean) => void;
  setCalculating: (calc: boolean, progress?: number) => void;
  getMaterialById: (id: string | null) => Material | undefined;
  resetAll: () => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  hallModel: null,
  soundSources: [],
  seats: [],
  soundRays: [],
  materials: materialsData as Material[],
  importHistory: [],
  validationResult: null,
  filters: {
    frequencyBands: ['low', 'mid', 'high'],
    issueTypes: [],
    selectedSeatIds: [],
    showOnlyIssues: false,
  },
  heatMapMetric: 'rt60',
  activeFrequencyBand: 'mid',
  isCalculating: false,
  calculationProgress: 0,

  setHallModel: (model) => set({ hallModel: model }),
  setSoundSources: (sources) => set({ soundSources: sources }),
  setSeats: (seats) => set({ seats }),
  setSoundRays: (rays) => set({ soundRays: rays }),

  addImportRecord: (meta) =>
    set((state) => ({
      importHistory: [...state.importHistory, meta],
    })),

  setValidationResult: (result) => set({ validationResult: result }),

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  setHeatMapMetric: (metric) => set({ heatMapMetric: metric }),
  setActiveFrequencyBand: (band) => set({ activeFrequencyBand: band }),

  toggleFrequencyBand: (band) =>
    set((state) => {
      const bands = state.filters.frequencyBands;
      const hasBand = bands.includes(band);
      return {
        filters: {
          ...state.filters,
          frequencyBands: hasBand ? bands.filter((b) => b !== band) : [...bands, band],
        },
      };
    }),

  toggleIssueType: (type) =>
    set((state) => {
      const types = state.filters.issueTypes;
      const hasType = types.includes(type);
      return {
        filters: {
          ...state.filters,
          issueTypes: hasType ? types.filter((t) => t !== type) : [...types, type],
        },
      };
    }),

  setSelectedSeatIds: (ids) =>
    set((state) => ({
      filters: { ...state.filters, selectedSeatIds: ids },
    })),

  setShowOnlyIssues: (show) =>
    set((state) => ({
      filters: { ...state.filters, showOnlyIssues: show },
    })),

  setCalculating: (calc, progress = 0) =>
    set({ isCalculating: calc, calculationProgress: progress }),

  getMaterialById: (id) => {
    if (!id) return undefined;
    return get().materials.find((m) => m.id === id);
  },

  resetAll: () =>
    set({
      hallModel: null,
      soundSources: [],
      seats: [],
      soundRays: [],
      importHistory: [],
      validationResult: null,
      filters: {
        frequencyBands: ['low', 'mid', 'high'],
        issueTypes: [],
        selectedSeatIds: [],
        showOnlyIssues: false,
      },
      isCalculating: false,
      calculationProgress: 0,
    }),
}));
