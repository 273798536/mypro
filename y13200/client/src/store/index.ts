import { create } from 'zustand';
import { Tour, Track, TrackStatus, TourStats } from '@/types';

interface AppState {
  tours: Tour[];
  tracks: Track[];
  selectedTour: Tour | null;
  selectedTrack: Track | null;
  tourStats: TourStats | null;
  loading: boolean;
  error: string | null;
  filters: {
    status?: TrackStatus;
    showId?: string;
    keyword?: string;
    page: number;
    limit: number;
  };
  setTours: (tours: Tour[]) => void;
  setTracks: (tracks: Track[]) => void;
  setSelectedTour: (tour: Tour | null) => void;
  setSelectedTrack: (track: Track | null) => void;
  setTourStats: (stats: TourStats | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<AppState['filters']>) => void;
  resetFilters: () => void;
}

const initialFilters = {
  page: 1,
  limit: 20,
};

export const useAppStore = create<AppState>((set) => ({
  tours: [],
  tracks: [],
  selectedTour: null,
  selectedTrack: null,
  tourStats: null,
  loading: false,
  error: null,
  filters: initialFilters,

  setTours: (tours) => set({ tours }),
  setTracks: (tracks) => set({ tracks }),
  setSelectedTour: (selectedTour) => set({ selectedTour }),
  setSelectedTrack: (selectedTrack) => set({ selectedTrack }),
  setTourStats: (tourStats) => set({ tourStats }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  resetFilters: () => set({ filters: initialFilters }),
}));
