import { create } from 'zustand';
import type {
  SelectionState,
  FilterState,
  ClippingState,
  ViewMode,
  ReviewItem,
  FishingRecord,
} from '@/types';
import { fishingRecords, dataGaps } from '@/data/mockData';

interface AppState {
  viewMode: ViewMode;
  selection: SelectionState;
  filters: FilterState;
  clipping: ClippingState;
  reviewItems: ReviewItem[];
  showDetailPanel: boolean;
  showReviewPanel: boolean;
  selectedDetailTab: string;
  tideCompareDate: string | null;

  setViewMode: (mode: ViewMode) => void;
  selectSpot: (spotId: string | null) => void;
  selectRecord: (recordId: string | null) => void;
  selectBuoy: (buoyId: string | null) => void;
  setFishSpeciesFilter: (species: string[]) => void;
  setSpotFilter: (spotIds: string[]) => void;
  setWaterQualityFilter: (levels: string[]) => void;
  setClippingEnabled: (enabled: boolean) => void;
  setClippingMode: (mode: ClippingState['mode']) => void;
  setClippingHorizontal: (value: number) => void;
  setClippingVertical: (value: number) => void;
  setShowDetailPanel: (show: boolean) => void;
  setShowReviewPanel: (show: boolean) => void;
  setSelectedDetailTab: (tab: string) => void;
  setTideCompareDate: (date: string | null) => void;
  updateReviewItem: (recordId: string, status: ReviewItem['status'], comments?: string) => void;
  getFilteredRecords: () => FishingRecord[];
  getDataGaps: () => typeof dataGaps;
  getBadRecords: () => FishingRecord[];
}

export const useAppStore = create<AppState>((set, get) => ({
  viewMode: 'explore',
  selection: {
    selectedSpotId: null,
    selectedRecordId: null,
    selectedBuoyId: null,
  },
  filters: {
    fishSpecies: [],
    dateRange: null,
    waterQualityLevel: [],
    spotIds: [],
  },
  clipping: {
    enabled: false,
    horizontal: 0,
    vertical: 0,
    mode: 'none',
  },
  reviewItems: fishingRecords.map((r) => ({
    id: `review-${r.id}`,
    recordId: r.id,
    status: r.status === 'pending' || r.status === 'warning' ? 'pending' : 'reviewed',
    comments: r.reviewNote,
  })),
  showDetailPanel: false,
  showReviewPanel: false,
  selectedDetailTab: 'record',
  tideCompareDate: null,

  setViewMode: (mode) => set({ viewMode: mode }),

  selectSpot: (spotId) =>
    set((state) => ({
      selection: { ...state.selection, selectedSpotId: spotId },
      showDetailPanel: spotId !== null,
    })),

  selectRecord: (recordId) =>
    set((state) => ({
      selection: { ...state.selection, selectedRecordId: recordId },
      showDetailPanel: recordId !== null,
    })),

  selectBuoy: (buoyId) =>
    set((state) => ({
      selection: { ...state.selection, selectedBuoyId: buoyId },
      showDetailPanel: buoyId !== null,
    })),

  setFishSpeciesFilter: (species) =>
    set((state) => ({
      filters: { ...state.filters, fishSpecies: species },
    })),

  setSpotFilter: (spotIds) =>
    set((state) => ({
      filters: { ...state.filters, spotIds },
    })),

  setWaterQualityFilter: (levels) =>
    set((state) => ({
      filters: { ...state.filters, waterQualityLevel: levels },
    })),

  setClippingEnabled: (enabled) =>
    set((state) => ({
      clipping: { ...state.clipping, enabled },
    })),

  setClippingMode: (mode) =>
    set((state) => ({
      clipping: { ...state.clipping, mode },
    })),

  setClippingHorizontal: (value) =>
    set((state) => ({
      clipping: { ...state.clipping, horizontal: value },
    })),

  setClippingVertical: (value) =>
    set((state) => ({
      clipping: { ...state.clipping, vertical: value },
    })),

  setShowDetailPanel: (show) => set({ showDetailPanel: show }),

  setShowReviewPanel: (show) => set({ showReviewPanel: show }),

  setSelectedDetailTab: (tab) => set({ selectedDetailTab: tab }),

  setTideCompareDate: (date) => set({ tideCompareDate: date }),

  updateReviewItem: (recordId, status, comments) =>
    set((state) => ({
      reviewItems: state.reviewItems.map((item) =>
        item.recordId === recordId
          ? { ...item, status, comments: comments ?? item.comments }
          : item
      ),
    })),

  getFilteredRecords: () => {
    const { filters } = get();
    let records = [...fishingRecords];

    if (filters.fishSpecies.length > 0) {
      records = records.filter((r) => filters.fishSpecies.includes(r.fishSpecies));
    }

    if (filters.spotIds.length > 0) {
      records = records.filter((r) => filters.spotIds.includes(r.spotId));
    }

    return records;
  },

  getDataGaps: () => dataGaps,

  getBadRecords: () => fishingRecords.filter((r) => r.isBadData),
}));
