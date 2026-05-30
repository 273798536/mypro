import { create } from 'zustand';
import type {
  Seat,
  BadRow,
  CommentRow,
  ParsedData,
  SubtitleScreenConfig,
  AuditoriumBounds,
} from '../types/seat';
import type { OcclusionResult } from '../types/occlusion';

interface DataState {
  seats: Seat[];
  badRows: BadRow[];
  comments: CommentRow[];
  occlusionResults: OcclusionResult[];
  subtitleScreen?: SubtitleScreenConfig;
  auditoriumBounds?: AuditoriumBounds;
  selectedSeatId?: string;
  isDataLoaded: boolean;

  setParsedData: (data: ParsedData) => void;
  setOcclusionResults: (results: OcclusionResult[]) => void;
  setSelectedSeatId: (id?: string) => void;
  clearData: () => void;
}

export const useDataStore = create<DataState>((set) => ({
  seats: [],
  badRows: [],
  comments: [],
  occlusionResults: [],
  isDataLoaded: false,

  setParsedData: (data) =>
    set({
      seats: data.seats,
      badRows: data.badRows,
      comments: data.comments,
      subtitleScreen: data.subtitleScreen,
      auditoriumBounds: data.auditoriumBounds,
      isDataLoaded: true,
    }),

  setOcclusionResults: (results) =>
    set({
      occlusionResults: results,
    }),

  setSelectedSeatId: (id) =>
    set({
      selectedSeatId: id,
    }),

  clearData: () =>
    set({
      seats: [],
      badRows: [],
      comments: [],
      occlusionResults: [],
      subtitleScreen: undefined,
      auditoriumBounds: undefined,
      selectedSeatId: undefined,
      isDataLoaded: false,
    }),
}));
