import { create } from "zustand";
import axios from "axios";
import type {
  Record,
  RecordHistory,
  ListQueryParams,
  ListResponse,
  ApiResponse,
} from "../../shared/types";

interface RecordsState {
  records: Record[];
  loading: boolean;
  selectedId: string | null;
  filter: ListQueryParams;
  total: number;
  statistics: ListResponse<Record>["statistics"] | null;
  selectedRecord: Record | null;
  recordHistory: RecordHistory[];
  fetchRecords: () => Promise<void>;
  fetchRecord: (id: string) => Promise<void>;
  updateRecord: (id: string, patch: Partial<Record>) => Promise<void>;
  fetchHistory: (id: string) => Promise<void>;
  setFilter: (filter: Partial<ListQueryParams>) => void;
}

export const useRecordsStore = create<RecordsState>((set, get) => ({
  records: [],
  loading: false,
  selectedId: null,
  filter: {
    page: 1,
    pageSize: 10,
  },
  total: 0,
  statistics: null,
  selectedRecord: null,
  recordHistory: [],

  fetchRecords: async () => {
    set({ loading: true });
    try {
      const { filter } = get();
      const { data } = await axios.get<ApiResponse<ListResponse<Record>>>("/api/records", {
        params: filter,
      });
      if (data.success && data.data) {
        set({
          records: data.data.items,
          total: data.data.total,
          statistics: data.data.statistics,
        });
      }
    } catch (error) {
      console.error("Failed to fetch records:", error);
    } finally {
      set({ loading: false });
    }
  },

  fetchRecord: async (id: string) => {
    set({ loading: true });
    try {
      const { data } = await axios.get<ApiResponse<Record>>(`/api/records/${id}`);
      if (data.success && data.data) {
        set({ selectedRecord: data.data, selectedId: id });
      }
    } catch (error) {
      console.error("Failed to fetch record:", error);
    } finally {
      set({ loading: false });
    }
  },

  updateRecord: async (id: string, patch: Partial<Record>) => {
    set({ loading: true });
    try {
      const { data } = await axios.put<ApiResponse<Record>>(`/api/records/${id}`, patch);
      if (data.success && data.data) {
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, ...data.data } : r
          ),
          selectedRecord:
            state.selectedRecord?.id === id
              ? { ...state.selectedRecord, ...data.data }
              : state.selectedRecord,
        }));
      }
    } catch (error) {
      console.error("Failed to update record:", error);
    } finally {
      set({ loading: false });
    }
  },

  fetchHistory: async (id: string) => {
    set({ loading: true });
    try {
      const { data } = await axios.get<ApiResponse<RecordHistory[]>>(
        `/api/records/${id}/history`
      );
      if (data.success && data.data) {
        set({ recordHistory: data.data });
      }
    } catch (error) {
      console.error("Failed to fetch record history:", error);
    } finally {
      set({ loading: false });
    }
  },

  setFilter: (newFilter: Partial<ListQueryParams>) => {
    set((state) => ({
      filter: { ...state.filter, ...newFilter },
    }));
  },
}));
