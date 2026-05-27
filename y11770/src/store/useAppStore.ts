import { create } from 'zustand';
import type {
  MigrationRecord,
  DataSource,
  FilterConditions,
  MatrixCubeData,
  CameraState,
  AppState,
  IndustryType,
  RatingLevel,
} from '../types';
import { getSampleData } from '../data/sampleData';
import { RATING_ORDER } from '../utils/ratingUtils';

interface AppStore extends AppState {
  setRecords: (records: MigrationRecord[]) => void;
  setFilters: (filters: Partial<FilterConditions>) => void;
  setSelectedCube: (cube: MatrixCubeData | null) => void;
  setHoveredCube: (cube: MatrixCubeData | null) => void;
  setCurrentMonth: (month: string) => void;
  setPlaybackSpeed: (speed: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setBalanceWeightEnabled: (enabled: boolean) => void;
  setShowAnomalies: (show: boolean) => void;
  setCameraState: (state: CameraState) => void;
  toggleIndustryFilter: (industry: IndustryType) => void;
  toggleRatingFilter: (rating: RatingLevel) => void;
  resetFilters: () => void;
  saveParameters: (name: string) => void;
  loadParameters: (id: string) => void;
}

const sampleData = getSampleData();

const initialFilters: FilterConditions = {
  industries: [],
  balanceMin: 0,
  balanceMax: 10000,
  migrationCountMin: 1,
  migrationCountMax: 1000,
  ratings: [],
};

export const useAppStore = create<AppStore>((set, get) => ({
  records: sampleData.records,
  dataSources: sampleData.dataSources,
  filters: initialFilters,
  selectedCube: null,
  hoveredCube: null,
  currentMonth: '2024-01',
  playbackSpeed: 1,
  isPlaying: false,
  balanceWeightEnabled: false,
  showAnomalies: true,
  cameraState: {
    position: { x: 15, y: 12, z: 20 },
    target: { x: 4.5, y: 4.5, z: 5.5 },
  },
  months: sampleData.months,

  setRecords: (records) => set({ records }),

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  setSelectedCube: (cube) => set({ selectedCube: cube }),

  setHoveredCube: (cube) => set({ hoveredCube: cube }),

  setCurrentMonth: (month) => set({ currentMonth: month }),

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  setBalanceWeightEnabled: (enabled) => set({ balanceWeightEnabled: enabled }),

  setShowAnomalies: (show) => set({ showAnomalies: show }),

  setCameraState: (state) => set({ cameraState: state }),

  toggleIndustryFilter: (industry) =>
    set((state) => {
      const industries = state.filters.industries.includes(industry)
        ? state.filters.industries.filter((i) => i !== industry)
        : [...state.filters.industries, industry];
      return { filters: { ...state.filters, industries } };
    }),

  toggleRatingFilter: (rating) =>
    set((state) => {
      const ratings = state.filters.ratings.includes(rating)
        ? state.filters.ratings.filter((r) => r !== rating)
        : [...state.filters.ratings, rating];
      return { filters: { ...state.filters, ratings } };
    }),

  resetFilters: () => set({ filters: initialFilters }),

  saveParameters: (name) => {
    const state = get();
    const params = {
      id: `param-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      cameraState: state.cameraState,
      filters: state.filters,
      balanceWeightEnabled: state.balanceWeightEnabled,
      showAnomalies: state.showAnomalies,
      playbackSpeed: state.playbackSpeed,
      currentMonth: state.currentMonth,
    };
    const saved = JSON.parse(localStorage.getItem('migration-params') || '[]');
    saved.push(params);
    localStorage.setItem('migration-params', JSON.stringify(saved));
  },

  loadParameters: (id) => {
    const saved = JSON.parse(localStorage.getItem('migration-params') || '[]');
    const params = saved.find((p: { id: string }) => p.id === id);
    if (params) {
      set({
        cameraState: params.cameraState,
        filters: params.filters,
        balanceWeightEnabled: params.balanceWeightEnabled,
        showAnomalies: params.showAnomalies,
        playbackSpeed: params.playbackSpeed,
        currentMonth: params.currentMonth,
      });
    }
  },
}));

export const useFilteredRecords = () => {
  const { records, filters } = useAppStore();

  return records.filter((record) => {
    if (filters.industries.length > 0 && !filters.industries.includes(record.industry as IndustryType)) {
      return false;
    }
    if (record.balance < filters.balanceMin || record.balance > filters.balanceMax) {
      return false;
    }
    if (
      record.migrationCount < filters.migrationCountMin ||
      record.migrationCount > filters.migrationCountMax
    ) {
      return false;
    }
    if (filters.ratings.length > 0) {
      if (!filters.ratings.includes(record.fromRating) && !filters.ratings.includes(record.toRating)) {
        return false;
      }
    }
    return true;
  });
};
