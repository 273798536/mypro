import { create } from 'zustand';
import type {
  MatchResult,
  Song,
  Conflict,
  Review,
  AuditLog,
  PaginatedResponse,
  FilterParams,
  PaginationParams,
  RiskLevel,
  MatchStatus,
} from '../../shared/types';
import { matchesApi, songsApi, conflictsApi, reviewsApi, exportApi } from '../utils/api';

interface StoreState {
  songs: Song[];
  matches: Array<MatchResult & { song: Song; copyright: unknown }>;
  conflicts: Array<Conflict & { matchResult: unknown }>;
  reviews: Array<Review & { matchResult: unknown }>;
  auditLogs: AuditLog[];
  loading: boolean;
  error: string | null;
  stats: {
    total: number;
    byRiskLevel: Record<string, number>;
    byMatchStatus: Record<string, number>;
  } | null;
  pagination: {
    songs: { page: number; pageSize: number; total: number; totalPages: number };
    matches: { page: number; pageSize: number; total: number; totalPages: number };
    conflicts: { page: number; pageSize: number; total: number; totalPages: number };
    reviews: { page: number; pageSize: number; total: number; totalPages: number };
    auditLogs: { page: number; pageSize: number; total: number; totalPages: number };
  };
  filters: {
    riskLevel?: RiskLevel;
    matchStatus?: MatchStatus;
    search?: string;
    artist?: string;
  };
  setFilters: (filters: Partial<StoreState['filters']>) => void;
  fetchSongs: (params?: FilterParams & PaginationParams) => Promise<void>;
  fetchMatches: (params?: FilterParams & PaginationParams) => Promise<void>;
  fetchConflicts: (params?: PaginationParams & { status?: string }) => Promise<void>;
  fetchReviews: (params?: PaginationParams & { status?: string }) => Promise<void>;
  fetchAuditLogs: (params?: PaginationParams & { entityType?: string; action?: string }) => Promise<void>;
  fetchStats: () => Promise<void>;
  runMatching: () => Promise<void>;
  addSong: (data: { name: string; artist: string; duration?: number }) => Promise<void>;
  importSongs: (file: File) => Promise<{ imported: number; errors: string[] }>;
  deleteSong: (id: string) => Promise<void>;
  resolveConflict: (id: string, data: { status: string; resolution: string }) => Promise<void>;
  createReview: (data: {
    matchResultId: string;
    status: string;
    comments?: string;
    riskLevelOverride?: string;
  }) => Promise<void>;
  setError: (error: string | null) => void;
}

const initialPagination = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,
};

export const useStore = create<StoreState>((set, get) => ({
  songs: [],
  matches: [],
  conflicts: [],
  reviews: [],
  auditLogs: [],
  loading: false,
  error: null,
  stats: null,
  pagination: {
    songs: { ...initialPagination },
    matches: { ...initialPagination },
    conflicts: { ...initialPagination },
    reviews: { ...initialPagination },
    auditLogs: { ...initialPagination },
  },
  filters: {},

  setFilters: (filters) => {
    set(state => ({ filters: { ...state.filters, ...filters } }));
  },

  fetchSongs: async (params) => {
    set({ loading: true, error: null });
    try {
      const result = await songsApi.getAll(params);
      set({
        songs: result.data,
        loading: false,
        pagination: {
          ...get().pagination,
          songs: {
            page: result.page,
            pageSize: result.pageSize,
            total: result.total,
            totalPages: result.totalPages,
          },
        },
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchMatches: async (params) => {
    set({ loading: true, error: null });
    try {
      const result = await matchesApi.getAll(params);
      set({
        matches: result.data,
        loading: false,
        pagination: {
          ...get().pagination,
          matches: {
            page: result.page,
            pageSize: result.pageSize,
            total: result.total,
            totalPages: result.totalPages,
          },
        },
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchConflicts: async (params) => {
    set({ loading: true, error: null });
    try {
      const result = await conflictsApi.getAll(params);
      set({
        conflicts: result.data,
        loading: false,
        pagination: {
          ...get().pagination,
          conflicts: {
            page: result.page,
            pageSize: result.pageSize,
            total: result.total,
            totalPages: result.totalPages,
          },
        },
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchReviews: async (params) => {
    set({ loading: true, error: null });
    try {
      const result = await reviewsApi.getAll(params);
      set({
        reviews: result.data,
        loading: false,
        pagination: {
          ...get().pagination,
          reviews: {
            page: result.page,
            pageSize: result.pageSize,
            total: result.total,
            totalPages: result.totalPages,
          },
        },
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchAuditLogs: async (params) => {
    set({ loading: true, error: null });
    try {
      const result = await exportApi.getAuditLogs(params);
      set({
        auditLogs: result.data,
        loading: false,
        pagination: {
          ...get().pagination,
          auditLogs: {
            page: result.page,
            pageSize: result.pageSize,
            total: result.total,
            totalPages: result.totalPages,
          },
        },
      });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchStats: async () => {
    set({ loading: true, error: null });
    try {
      const stats = await matchesApi.getStats();
      set({ stats, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  runMatching: async () => {
    set({ loading: true, error: null });
    try {
      await matchesApi.run();
      await get().fetchMatches();
      await get().fetchStats();
      set({ loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  addSong: async (data) => {
    set({ loading: true, error: null });
    try {
      await songsApi.create(data);
      await get().fetchSongs();
      set({ loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  importSongs: async (file) => {
    set({ loading: true, error: null });
    try {
      const result = await songsApi.import(file);
      await get().fetchSongs();
      set({ loading: false });
      return result;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      return { imported: 0, errors: [(error as Error).message] };
    }
  },

  deleteSong: async (id) => {
    set({ loading: true, error: null });
    try {
      await songsApi.delete(id);
      await get().fetchSongs();
      set({ loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  resolveConflict: async (id, data) => {
    set({ loading: true, error: null });
    try {
      await conflictsApi.resolve(id, data);
      await get().fetchConflicts();
      await get().fetchMatches();
      set({ loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  createReview: async (data) => {
    set({ loading: true, error: null });
    try {
      await reviewsApi.create(data);
      await get().fetchReviews();
      await get().fetchMatches();
      set({ loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  setError: (error) => {
    set({ error });
  },
}));
