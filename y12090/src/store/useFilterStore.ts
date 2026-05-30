import { create } from 'zustand';
import type {
  OcclusionFilter,
  SeatFilter,
  OcclusionType,
  OcclusionSeverity,
  OcclusionSource,
} from '../types/occlusion';

interface FilterState {
  occlusionFilter: OcclusionFilter;
  seatFilter: SeatFilter;
  showBadRows: boolean;
  showSightLines: boolean;
  showOnlySelected: boolean;

  setOcclusionTypeFilter: (types: OcclusionType[]) => void;
  setOcclusionSeverityFilter: (severities: OcclusionSeverity[]) => void;
  setOcclusionSourceFilter: (sources: OcclusionSource[]) => void;
  setSectionFilter: (sections: string[]) => void;
  setRowFilter: (rows: string[]) => void;
  setSeatNumberFilter: (numbers: number[]) => void;
  setShowBadRows: (show: boolean) => void;
  setShowSightLines: (show: boolean) => void;
  setShowOnlySelected: (show: boolean) => void;
  resetFilters: () => void;
}

const DEFAULT_OCCLUSION_FILTER: OcclusionFilter = {
  types: ['normal', 'subtitle_screen', 'obstacle', 'wall_penetration', 'screen_height_error'],
  severities: ['info', 'warning', 'error'],
  sources: ['none', 'subtitle_screen', 'other_seat', 'wall', 'parameter_error'],
};

const DEFAULT_SEAT_FILTER: SeatFilter = {
  sections: [],
  rows: [],
  seatNumbers: [],
};

export const useFilterStore = create<FilterState>((set) => ({
  occlusionFilter: DEFAULT_OCCLUSION_FILTER,
  seatFilter: DEFAULT_SEAT_FILTER,
  showBadRows: true,
  showSightLines: true,
  showOnlySelected: false,

  setOcclusionTypeFilter: (types) =>
    set((state) => ({
      occlusionFilter: { ...state.occlusionFilter, types },
    })),

  setOcclusionSeverityFilter: (severities) =>
    set((state) => ({
      occlusionFilter: { ...state.occlusionFilter, severities },
    })),

  setOcclusionSourceFilter: (sources) =>
    set((state) => ({
      occlusionFilter: { ...state.occlusionFilter, sources },
    })),

  setSectionFilter: (sections) =>
    set((state) => ({
      seatFilter: { ...state.seatFilter, sections },
    })),

  setRowFilter: (rows) =>
    set((state) => ({
      seatFilter: { ...state.seatFilter, rows },
    })),

  setSeatNumberFilter: (seatNumbers) =>
    set((state) => ({
      seatFilter: { ...state.seatFilter, seatNumbers },
    })),

  setShowBadRows: (showBadRows) => set({ showBadRows }),

  setShowSightLines: (showSightLines) => set({ showSightLines }),

  setShowOnlySelected: (showOnlySelected) => set({ showOnlySelected }),

  resetFilters: () =>
    set({
      occlusionFilter: DEFAULT_OCCLUSION_FILTER,
      seatFilter: DEFAULT_SEAT_FILTER,
      showBadRows: true,
      showSightLines: true,
      showOnlySelected: false,
    }),
}));
