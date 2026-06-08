import { create } from 'zustand';
import type {
  ModelRecord,
  ModelRecordSummary,
  HistoryRecord,
  ProcessingRecord
} from '../types';
import { recordApi } from '../api/client';

interface AppState {
  records: ModelRecordSummary[];
  currentRecord: ModelRecord | null;
  history: HistoryRecord[];
  loading: boolean;
  error: string | null;
  selectedTimestamp: string | null;
  selectedProcessingRecord: ProcessingRecord | null;

  fetchRecords: () => Promise<void>;
  fetchRecord: (id: string) => Promise<void>;
  fetchHistory: (id: string) => Promise<void>;
  updateRecord: (id: string, data: any) => Promise<ModelRecord>;
  downloadRecord: (id: string) => Promise<void>;
  selectTimestamp: (ts: string | null) => void;
  clearCurrent: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  records: [],
  currentRecord: null,
  history: [],
  loading: false,
  error: null,
  selectedTimestamp: null,
  selectedProcessingRecord: null,

  fetchRecords: async () => {
    set({ loading: true, error: null });
    try {
      const data = await recordApi.getAll();
      set({ records: data });
    } catch (e: any) {
      set({ error: e.message || '加载记录列表失败' });
    } finally {
      set({ loading: false });
    }
  },

  fetchRecord: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const data = await recordApi.getById(id);
      const firstTs = data.processingRecords[0]?.timestamp || null;
      set({
        currentRecord: data,
        selectedTimestamp: firstTs,
        selectedProcessingRecord: data.processingRecords[0] || null
      });
    } catch (e: any) {
      set({ error: e.message || '加载记录详情失败' });
    } finally {
      set({ loading: false });
    }
  },

  fetchHistory: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const data = await recordApi.getHistory(id);
      set({ history: data });
    } catch (e: any) {
      set({ error: e.message || '加载历史记录失败' });
    } finally {
      set({ loading: false });
    }
  },

  updateRecord: async (id: string, data: any) => {
    set({ loading: true, error: null });
    try {
      const updated = await recordApi.update(id, data);
      set({ currentRecord: updated });
      const list = get().records;
      const idx = list.findIndex(r => r.id === id);
      if (idx !== -1) {
        const newList = [...list];
        newList[idx] = {
          id: updated.id,
          runTime: updated.runTime,
          status: updated.status,
          timeParameters: updated.timeParameters,
          unitConversionError: updated.unitConversionError,
          conclusion: updated.conclusion,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt
        };
        set({ records: newList });
      }
      return updated;
    } catch (e: any) {
      set({ error: e.message || '更新记录失败' });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  downloadRecord: async (id: string) => {
    try {
      await recordApi.download(id);
    } catch (e: any) {
      set({ error: e.message || '下载失败' });
    }
  },

  selectTimestamp: (ts: string | null) => {
    const current = get().currentRecord;
    if (!current || !ts) {
      set({ selectedTimestamp: null, selectedProcessingRecord: null });
      return;
    }
    const rec = current.processingRecords.find(p => p.timestamp === ts) || null;
    set({ selectedTimestamp: ts, selectedProcessingRecord: rec });
  },

  clearCurrent: () => {
    set({
      currentRecord: null,
      history: [],
      selectedTimestamp: null,
      selectedProcessingRecord: null
    });
  }
}));
