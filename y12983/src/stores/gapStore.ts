import { create } from 'zustand';
import type { GapReport, ListParams, PagedResult, CreateGapData, UpdateGapData, DuplicateResult } from '@/types';
import { gapService } from '@/services/gapService';
import { historyService } from '@/services/historyService';

interface GapState {
  gaps: GapReport[];
  total: number;
  currentPage: number;
  pageSize: number;
  loading: boolean;
  currentGap: GapReport | null;
  stats: {
    total: number;
    pending: number;
    processing: number;
    fixed: number;
    ignored: number;
    thisMonthNew: number;
    critical: number;
  };
  duplicates: DuplicateResult[];

  fetchGaps: (params?: ListParams) => void;
  fetchGap: (id: string) => GapReport | null;
  createGap: (data: CreateGapData, operator: string) => GapReport;
  updateGap: (id: string, data: UpdateGapData) => GapReport | null;
  updateStatus: (id: string, status: GapReport['status'], operator: string) => GapReport | null;
  concludeGap: (id: string, conclusion: string, operator: string) => GapReport | null;
  detectDuplicates: (data: CreateGapData, threshold?: number) => DuplicateResult[];
  detectDuplicatesById: (id: string, threshold?: number) => DuplicateResult[];
  mergeDuplicates: (targetId: string, sourceIds: string[], operator: string) => GapReport | null;
  fetchStats: () => void;
  resetToMock: () => void;
}

export const useGapStore = create<GapState>((set, get) => ({
  gaps: [],
  total: 0,
  currentPage: 1,
  pageSize: 10,
  loading: false,
  currentGap: null,
  stats: {
    total: 0,
    pending: 0,
    processing: 0,
    fixed: 0,
    ignored: 0,
    thisMonthNew: 0,
    critical: 0,
  },
  duplicates: [],

  fetchGaps: (params = {}) => {
    const result: PagedResult<GapReport> = gapService.list(params);
    set({
      gaps: result.list,
      total: result.total,
      currentPage: result.page,
      pageSize: result.pageSize,
    });
  },

  fetchGap: (id: string) => {
    const gap = gapService.get(id);
    set({ currentGap: gap });
    return gap;
  },

  createGap: (data: CreateGapData, operator: string) => {
    const newGap = gapService.create(data);
    historyService.addCreated(newGap.id, operator, `创建缺口报告：${newGap.title}`);
    get().fetchStats();
    get().fetchGaps({ page: 1, pageSize: get().pageSize });
    return newGap;
  },

  updateGap: (id: string, data: UpdateGapData) => {
    const updated = gapService.update(id, data);
    if (updated) {
      set({ currentGap: updated });
      get().fetchStats();
    }
    return updated;
  },

  updateStatus: (id: string, status: GapReport['status'], operator: string) => {
    const gap = gapService.get(id);
    if (!gap) return null;

    const updated = gapService.updateStatus(id, status);
    if (updated) {
      historyService.addStatusChange(id, gap.status, status, operator);
      set({ currentGap: updated });
      get().fetchStats();
      get().fetchGaps({ page: get().currentPage, pageSize: get().pageSize });
    }
    return updated;
  },

  concludeGap: (id: string, conclusion: string, operator: string) => {
    const concluded = gapService.conclude(id, conclusion, operator);
    if (concluded) {
      historyService.addConcluded(id, operator, `确认最终结论：${conclusion.slice(0, 50)}...`);
      set({ currentGap: concluded });
      get().fetchStats();
    }
    return concluded;
  },

  detectDuplicates: (data: CreateGapData, threshold = 0.7) => {
    const duplicates = gapService.detectDuplicates(data, threshold);
    set({ duplicates });
    return duplicates;
  },

  detectDuplicatesById: (id: string, threshold = 0.7) => {
    const duplicates = gapService.detectDuplicatesById(id, threshold);
    set({ duplicates });
    return duplicates;
  },

  mergeDuplicates: (targetId: string, sourceIds: string[], operator: string) => {
    const merged = gapService.mergeDuplicates(targetId, sourceIds);
    if (merged) {
      historyService.addMerged(targetId, operator, `合并了 ${sourceIds.length} 条重复记录`);
      set({ currentGap: merged, duplicates: [] });
      get().fetchStats();
      get().fetchGaps({ page: 1, pageSize: get().pageSize });
    }
    return merged;
  },

  fetchStats: () => {
    const stats = gapService.getStats();
    set({ stats });
  },

  resetToMock: () => {
    gapService.resetToMock();
    historyService.resetToMock();
    get().fetchStats();
    get().fetchGaps({ page: 1, pageSize: get().pageSize });
  },
}));
