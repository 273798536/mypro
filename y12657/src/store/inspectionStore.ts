import { create } from 'zustand';
import type {
  Inspection,
  InspectionDetail,
  SectionParams,
  MeasurePoint,
  ChangeHistory,
  BatchCompareResult,
  InspectionStatus,
} from '@shared/types';
import {
  listInspections,
  getInspection,
  getCompare,
  getHistory,
  createInspection,
  importInspection,
  updateParams as apiUpdateParams,
  updatePoint as apiUpdatePoint,
  reviewInspection,
  type InspectionListItem,
  type ListParams,
  type CreateInspectionData,
  type ImportInspectionData,
  type UpdateParamsData,
  type UpdatePointData,
  type ReviewData,
} from '@/api/client';

export interface CurrentDetail {
  inspection: Inspection | null;
  params: SectionParams | null;
  points: MeasurePoint[];
}

interface InspectionState {
  inspections: InspectionListItem[];
  currentDetail: CurrentDetail;
  compareData: BatchCompareResult | null;
  history: ChangeHistory[];
  loading: boolean;
  error: string | null;

  fetchList: (params?: ListParams) => Promise<void>;
  fetchDetail: (id: string) => Promise<void>;
  fetchCompare: (id: string, beforeBatch?: string, afterBatch?: string) => Promise<void>;
  fetchHistory: (id: string) => Promise<void>;
  createImport: (data: ImportInspectionData) => Promise<string>;
  create: (data: CreateInspectionData) => Promise<Inspection>;
  updateParams: (id: string, data: UpdateParamsData) => Promise<void>;
  updatePoint: (id: string, pointId: string, data: UpdatePointData) => Promise<void>;
  review: (id: string, data: ReviewData) => Promise<InspectionStatus>;
  clearDetail: () => void;
  setError: (error: string | null) => void;
}

export const useInspectionStore = create<InspectionState>((set, get) => ({
  inspections: [],
  currentDetail: {
    inspection: null,
    params: null,
    points: [],
  },
  compareData: null,
  history: [],
  loading: false,
  error: null,

  fetchList: async (params?: ListParams) => {
    set({ loading: true, error: null });
    try {
      const data = await listInspections(params);
      set({ inspections: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载列表失败' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  fetchDetail: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const data: InspectionDetail = await getInspection(id);
      set({
        currentDetail: {
          inspection: data.inspection,
          params: data.params,
          points: data.points,
        },
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载详情失败' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  fetchCompare: async (id: string, beforeBatch?: string, afterBatch?: string) => {
    set({ loading: true, error: null });
    try {
      const data = await getCompare(id, beforeBatch, afterBatch);
      set({ compareData: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载对比数据失败' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  fetchHistory: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const data = await getHistory(id);
      set({ history: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载历史记录失败' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  createImport: async (data: ImportInspectionData) => {
    set({ loading: true, error: null });
    try {
      const result = await importInspection(data);
      await get().fetchList();
      return result.id;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '导入失败' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  create: async (data: CreateInspectionData) => {
    set({ loading: true, error: null });
    try {
      const inspection = await createInspection(data);
      await get().fetchList();
      return inspection;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '创建失败' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updateParams: async (id: string, data: UpdateParamsData) => {
    set({ loading: true, error: null });
    try {
      const result = await apiUpdateParams(id, data);
      const prev = get().currentDetail;
      set({
        currentDetail: {
          ...prev,
          params: result.params,
          points: result.points,
          inspection: prev.inspection
            ? { ...prev.inspection, currentBatchId: result.batchId, status: 'reviewing' as InspectionStatus }
            : null,
        },
      });
      await get().fetchList();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '更新参数失败' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updatePoint: async (id: string, pointId: string, data: UpdatePointData) => {
    set({ loading: true, error: null });
    try {
      const updatedPoint = await apiUpdatePoint(id, pointId, data);
      const prev = get().currentDetail;
      set({
        currentDetail: {
          ...prev,
          points: prev.points.map((p) => (p.id === pointId ? updatedPoint : p)),
          inspection: prev.inspection
            ? { ...prev.inspection, status: 'reviewing' as InspectionStatus }
            : null,
        },
      });
      await get().fetchList();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '更新测点失败' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  review: async (id: string, data: ReviewData) => {
    set({ loading: true, error: null });
    try {
      const result = await reviewInspection(id, data);
      const prev = get().currentDetail;
      set({
        currentDetail: {
          ...prev,
          inspection: prev.inspection ? { ...prev.inspection, status: result.status } : null,
        },
      });
      await get().fetchList();
      return result.status;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '复核失败' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  clearDetail: () => {
    set({
      currentDetail: { inspection: null, params: null, points: [] },
      compareData: null,
      history: [],
    });
  },

  setError: (error: string | null) => set({ error }),
}));
