/**
 * 样本状态管理 Store
 * 管理培养基批号和样本检测记录的增删改查、筛选、搜索等状态
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MediaBatch, SampleRecord } from '@/mock/sampleData';
import { findStandardName } from '@/mock/speciesSynonyms';
import {
  STORAGE_KEYS,
  getStorageData,
  setStorageData,
  initMockData,
  isMockDataInitialized
} from '@/mock/initMockData';

/** 样本筛选条件 */
export interface SampleFilter {
  /** 关联批号ID */
  batchId?: string;
  /** 检测结果筛选 */
  result?: SampleRecord['result'];
  /** 记录状态筛选 */
  status?: SampleRecord['status'];
  /** 是否仅显示同义词案例 */
  onlySynonymCases?: boolean;
  /** 物种名称（支持模糊搜索） */
  speciesKeyword?: string;
  /** 样本编号/名称关键字 */
  keyword?: string;
  /** 检测人筛选 */
  testedBy?: string;
  /** 检测日期范围 */
  dateRange?: { start: string; end: string };
}

/** 批号筛选条件 */
export interface BatchFilter {
  /** 批号状态 */
  status?: MediaBatch['status'];
  /** 关键字搜索（批号、培养基名称、厂家） */
  keyword?: string;
}

/** 排序配置 */
export interface SortConfig {
  /** 排序字段 */
  field: 'sampleNo' | 'testedAt' | 'colonyCount' | 'originalRowNo';
  /** 排序方向 */
  order: 'asc' | 'desc';
}

/** 样本 Store 状态与操作 */
interface SampleStoreState {
  // ========== 数据状态 ==========
  /** 培养基批号列表 */
  mediaBatches: MediaBatch[];
  /** 样本记录列表 */
  sampleRecords: SampleRecord[];

  // ========== 筛选与排序 ==========
  /** 批号筛选条件 */
  batchFilter: BatchFilter;
  /** 样本筛选条件 */
  sampleFilter: SampleFilter;
  /** 排序配置 */
  sortConfig: SortConfig;

  // ========== UI 状态 ==========
  /** 当前选中的批号ID */
  selectedBatchId: string | null;
  /** 当前选中的样本ID集合 */
  selectedSampleIds: Set<string>;
  /** 数据加载状态 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;

  // ========== 数据加载 ==========
  /**
   * 初始化数据（优先从localStorage加载，否则从mock初始化）
   */
  initData: () => Promise<void>;
  /**
   * 从localStorage刷新数据
   */
  refreshFromStorage: () => void;
  /**
   * 重置为初始Mock数据
   */
  resetData: () => Promise<void>;

  // ========== 筛选操作 ==========
  /**
   * 设置批号筛选条件
   * @param filter 筛选条件
   */
  setBatchFilter: (filter: Partial<BatchFilter>) => void;
  /**
   * 设置样本筛选条件
   * @param filter 筛选条件
   */
  setSampleFilter: (filter: Partial<SampleFilter>) => void;
  /**
   * 清除所有筛选条件
   */
  clearFilters: () => void;
  /**
   * 设置排序配置
   * @param config 排序配置
   */
  setSortConfig: (config: SortConfig) => void;

  // ========== 选择操作 ==========
  /**
   * 选择批号
   * @param batchId 批号ID，null表示取消选择
   */
  selectBatch: (batchId: string | null) => void;
  /**
   * 切换样本选中状态
   * @param sampleId 样本ID
   */
  toggleSampleSelection: (sampleId: string) => void;
  /**
   * 全选/取消全选当前筛选结果
   * @param selectAll 是否全选
   */
  toggleSelectAllSamples: (selectAll: boolean) => void;
  /**
   * 清空样本选择
   */
  clearSampleSelection: () => void;

  // ========== CRUD 操作 ==========
  /**
   * 新增培养基批号
   * @param batch 批号数据（不含id、创建时间等自动字段）
   */
  addMediaBatch: (batch: Omit<MediaBatch, 'id' | 'createdAt' | 'updatedAt'>) => void;
  /**
   * 更新培养基批号
   * @param id 批号ID
   * @param updates 更新字段
   */
  updateMediaBatch: (id: string, updates: Partial<MediaBatch>) => void;
  /**
   * 删除培养基批号（级联删除关联样本）
   * @param id 批号ID
   */
  deleteMediaBatch: (id: string) => void;

  /**
   * 新增样本记录
   * @param sample 样本数据（自动处理同义词标准化）
   */
  addSampleRecord: (sample: Omit<SampleRecord, 'id' | 'standardSpeciesName' | 'isSynonymCase' | 'createdAt' | 'updatedAt'>) => void;
  /**
   * 更新样本记录
   * @param id 样本ID
   * @param updates 更新字段（物种名称变更时自动重新标准化）
   */
  updateSampleRecord: (id: string, updates: Partial<SampleRecord>) => void;
  /**
   * 批量更新样本记录状态
   * @param ids 样本ID列表
   * @param updates 公共更新字段
   */
  batchUpdateSamples: (ids: string[], updates: Partial<SampleRecord>) => void;
  /**
   * 删除样本记录
   * @param id 样本ID
   */
  deleteSampleRecord: (id: string) => void;

  // ========== 派生数据（查询方法） ==========
  /**
   * 获取筛选后的批号列表
   */
  getFilteredBatches: () => MediaBatch[];
  /**
   * 获取筛选并排序后的样本列表
   */
  getFilteredSamples: () => SampleRecord[];
  /**
   * 根据ID获取批号详情
   * @param id 批号ID
   */
  getBatchById: (id: string) => MediaBatch | undefined;
  /**
   * 根据ID获取样本详情
   * @param id 样本ID
   */
  getSampleById: (id: string) => SampleRecord | undefined;
  /**
   * 获取指定批号下的所有样本
   * @param batchId 批号ID
   */
  getSamplesByBatchId: (batchId: string) => SampleRecord[];
  /**
   * 获取同义词案例样本列表
   */
  getSynonymCases: () => SampleRecord[];
  /**
   * 获取统计概览
   */
  getStatistics: () => {
    totalBatches: number;
    totalSamples: number;
    synonymCaseCount: number;
    resultCounts: Record<SampleRecord['result'], number>;
    statusCounts: Record<SampleRecord['status'], number>;
  };
}

/** 生成唯一ID */
function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

/** 保存样本数据到localStorage */
function persistSampleData(batches: MediaBatch[], samples: SampleRecord[]) {
  setStorageData(STORAGE_KEYS.MEDIA_BATCHES, batches);
  setStorageData(STORAGE_KEYS.SAMPLE_RECORDS, samples);
}

export const useSampleStore = create<SampleStoreState>()(
  persist(
    (set, get) => ({
      // ========== 初始状态 ==========
      mediaBatches: [],
      sampleRecords: [],
      batchFilter: {},
      sampleFilter: {},
      sortConfig: { field: 'originalRowNo', order: 'asc' },
      selectedBatchId: null,
      selectedSampleIds: new Set(),
      isLoading: false,
      error: null,

      // ========== 数据加载 ==========
      initData: async () => {
        set({ isLoading: true, error: null });
        try {
          // 确保mock数据已初始化
          if (!isMockDataInitialized()) {
            initMockData({ verbose: false });
          }
          // 从localStorage加载
          const batches = getStorageData<MediaBatch[]>(STORAGE_KEYS.MEDIA_BATCHES, []);
          const samples = getStorageData<SampleRecord[]>(STORAGE_KEYS.SAMPLE_RECORDS, []);
          set({
            mediaBatches: batches,
            sampleRecords: samples,
            isLoading: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '数据加载失败',
            isLoading: false
          });
        }
      },

      refreshFromStorage: () => {
        const batches = getStorageData<MediaBatch[]>(STORAGE_KEYS.MEDIA_BATCHES, []);
        const samples = getStorageData<SampleRecord[]>(STORAGE_KEYS.SAMPLE_RECORDS, []);
        set({ mediaBatches: batches, sampleRecords: samples });
      },

      resetData: async () => {
        set({ isLoading: true, error: null });
        try {
          const { resetMockData } = await import('@/mock/initMockData');
          resetMockData({ verbose: false });
          get().refreshFromStorage();
          get().clearFilters();
          get().clearSampleSelection();
          set({ selectedBatchId: null, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '数据重置失败',
            isLoading: false
          });
        }
      },

      // ========== 筛选操作 ==========
      setBatchFilter: (filter) => {
        set((state) => ({
          batchFilter: { ...state.batchFilter, ...filter }
        }));
      },

      setSampleFilter: (filter) => {
        set((state) => ({
          sampleFilter: { ...state.sampleFilter, ...filter }
        }));
      },

      clearFilters: () => {
        set({
          batchFilter: {},
          sampleFilter: {}
        });
      },

      setSortConfig: (config) => {
        set({ sortConfig: config });
      },

      // ========== 选择操作 ==========
      selectBatch: (batchId) => {
        set({
          selectedBatchId: batchId,
          sampleFilter: batchId
            ? { ...get().sampleFilter, batchId }
            : { ...get().sampleFilter, batchId: undefined }
        });
        get().clearSampleSelection();
      },

      toggleSampleSelection: (sampleId) => {
        set((state) => {
          const newSet = new Set(state.selectedSampleIds);
          if (newSet.has(sampleId)) {
            newSet.delete(sampleId);
          } else {
            newSet.add(sampleId);
          }
          return { selectedSampleIds: newSet };
        });
      },

      toggleSelectAllSamples: (selectAll) => {
        if (selectAll) {
          const filtered = get().getFilteredSamples();
          set({ selectedSampleIds: new Set(filtered.map((s) => s.id)) });
        } else {
          set({ selectedSampleIds: new Set() });
        }
      },

      clearSampleSelection: () => {
        set({ selectedSampleIds: new Set() });
      },

      // ========== CRUD 操作 ==========
      addMediaBatch: (batch) => {
        const now = new Date().toISOString();
        const newBatch: MediaBatch = {
          ...batch,
          id: genId('batch'),
          createdAt: now,
          updatedAt: now
        };
        set((state) => {
          const newBatches = [...state.mediaBatches, newBatch];
          persistSampleData(newBatches, state.sampleRecords);
          return { mediaBatches: newBatches };
        });
      },

      updateMediaBatch: (id, updates) => {
        set((state) => {
          const newBatches = state.mediaBatches.map((b) =>
            b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b
          );
          persistSampleData(newBatches, state.sampleRecords);
          return { mediaBatches: newBatches };
        });
      },

      deleteMediaBatch: (id) => {
        set((state) => {
          const newBatches = state.mediaBatches.filter((b) => b.id !== id);
          const newSamples = state.sampleRecords.filter((s) => s.batchId !== id);
          persistSampleData(newBatches, newSamples);
          return {
            mediaBatches: newBatches,
            sampleRecords: newSamples,
            selectedBatchId: state.selectedBatchId === id ? null : state.selectedBatchId
          };
        });
      },

      addSampleRecord: (sample) => {
        const now = new Date().toISOString();
        const standardName = findStandardName(sample.speciesName);
        const isSynonym = standardName !== sample.speciesName;
        const newSample: SampleRecord = {
          ...sample,
          id: genId('sample'),
          standardSpeciesName: standardName,
          isSynonymCase: isSynonym,
          createdAt: now,
          updatedAt: now
        };
        set((state) => {
          const newSamples = [...state.sampleRecords, newSample];
          persistSampleData(state.mediaBatches, newSamples);
          return { sampleRecords: newSamples };
        });
      },

      updateSampleRecord: (id, updates) => {
        set((state) => {
          const newSamples = state.sampleRecords.map((s) => {
            if (s.id !== id) return s;
            const merged = { ...s, ...updates, updatedAt: new Date().toISOString() };
            // 如果物种名称变更，重新标准化
            if (updates.speciesName && updates.speciesName !== s.speciesName) {
              const stdName = findStandardName(updates.speciesName);
              merged.standardSpeciesName = stdName;
              merged.isSynonymCase = stdName !== updates.speciesName;
            }
            return merged;
          });
          persistSampleData(state.mediaBatches, newSamples);
          return { sampleRecords: newSamples };
        });
      },

      batchUpdateSamples: (ids, updates) => {
        set((state) => {
          const idSet = new Set(ids);
          const now = new Date().toISOString();
          const newSamples = state.sampleRecords.map((s) => {
            if (!idSet.has(s.id)) return s;
            const merged = { ...s, ...updates, updatedAt: now };
            if (updates.speciesName) {
              const stdName = findStandardName(updates.speciesName);
              merged.standardSpeciesName = stdName;
              merged.isSynonymCase = stdName !== updates.speciesName;
            }
            return merged;
          });
          persistSampleData(state.mediaBatches, newSamples);
          return { sampleRecords: newSamples };
        });
      },

      deleteSampleRecord: (id) => {
        set((state) => {
          const newSamples = state.sampleRecords.filter((s) => s.id !== id);
          const newSelected = new Set(state.selectedSampleIds);
          newSelected.delete(id);
          persistSampleData(state.mediaBatches, newSamples);
          return {
            sampleRecords: newSamples,
            selectedSampleIds: newSelected
          };
        });
      },

      // ========== 派生数据查询 ==========
      getFilteredBatches: () => {
        const { mediaBatches, batchFilter } = get();
        return mediaBatches.filter((batch) => {
          if (batchFilter.status && batch.status !== batchFilter.status) return false;
          if (batchFilter.keyword) {
            const kw = batchFilter.keyword.toLowerCase();
            const matchFields = [batch.batchNo, batch.mediaName, batch.manufacturer].join(' ').toLowerCase();
            if (!matchFields.includes(kw)) return false;
          }
          return true;
        });
      },

      getFilteredSamples: () => {
        const { sampleRecords, sampleFilter, sortConfig } = get();
        let result = sampleRecords.filter((sample) => {
          if (sampleFilter.batchId && sample.batchId !== sampleFilter.batchId) return false;
          if (sampleFilter.result && sample.result !== sampleFilter.result) return false;
          if (sampleFilter.status && sample.status !== sampleFilter.status) return false;
          if (sampleFilter.onlySynonymCases && !sample.isSynonymCase) return false;
          if (sampleFilter.testedBy && sample.testedBy !== sampleFilter.testedBy) return false;
          if (sampleFilter.speciesKeyword) {
            const kw = sampleFilter.speciesKeyword.toLowerCase();
            const matchSpecies = (sample.speciesName + sample.standardSpeciesName).toLowerCase();
            if (!matchSpecies.includes(kw)) return false;
          }
          if (sampleFilter.keyword) {
            const kw = sampleFilter.keyword.toLowerCase();
            const matchText = [sample.sampleNo, sample.sampleName, sample.sourceRemark].join(' ').toLowerCase();
            if (!matchText.includes(kw)) return false;
          }
          if (sampleFilter.dateRange) {
            const { start, end } = sampleFilter.dateRange;
            if (start && sample.testedAt < start) return false;
            if (end && sample.testedAt > end + 'T23:59:59.999Z') return false;
          }
          return true;
        });

        // 排序
        result.sort((a, b) => {
          const { field, order } = sortConfig;
          let compare = 0;
          switch (field) {
            case 'sampleNo':
              compare = a.sampleNo.localeCompare(b.sampleNo);
              break;
            case 'testedAt':
              compare = new Date(a.testedAt).getTime() - new Date(b.testedAt).getTime();
              break;
            case 'colonyCount':
              compare = (a.colonyCount ?? -1) - (b.colonyCount ?? -1);
              break;
            case 'originalRowNo':
              compare = a.originalRowNo - b.originalRowNo;
              break;
          }
          return order === 'asc' ? compare : -compare;
        });

        return result;
      },

      getBatchById: (id) => {
        return get().mediaBatches.find((b) => b.id === id);
      },

      getSampleById: (id) => {
        return get().sampleRecords.find((s) => s.id === id);
      },

      getSamplesByBatchId: (batchId) => {
        return get().sampleRecords.filter((s) => s.batchId === batchId);
      },

      getSynonymCases: () => {
        return get().sampleRecords.filter((s) => s.isSynonymCase);
      },

      getStatistics: () => {
        const { mediaBatches, sampleRecords } = get();
        const resultCounts = {
          阳性: 0,
          阴性: 0,
          可疑: 0,
          未检出: 0
        } as Record<SampleRecord['result'], number>;
        const statusCounts = {
          待审核: 0,
          已审核: 0,
          需修正: 0,
          已确认: 0
        } as Record<SampleRecord['status'], number>;
        let synonymCount = 0;

        for (const s of sampleRecords) {
          resultCounts[s.result]++;
          statusCounts[s.status]++;
          if (s.isSynonymCase) synonymCount++;
        }

        return {
          totalBatches: mediaBatches.length,
          totalSamples: sampleRecords.length,
          synonymCaseCount: synonymCount,
          resultCounts,
          statusCounts
        };
      }
    }),
    {
      name: 'sample-store-storage',
      partialize: (state) => ({
        mediaBatches: state.mediaBatches,
        sampleRecords: state.sampleRecords,
        batchFilter: state.batchFilter,
        sampleFilter: state.sampleFilter,
        sortConfig: state.sortConfig
      })
    }
  )
);
