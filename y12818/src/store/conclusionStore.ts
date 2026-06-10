/**
 * 结论记录状态管理 Store
 * 管理培养基批号相关的结论报告、重复结论管理
 */

import { create } from 'zustand';
import { persist as persistMiddleware } from 'zustand/middleware';
import type { ConclusionRecord } from '@/mock/sampleData';
import {
  STORAGE_KEYS,
  getStorageData,
  setStorageData
} from '@/mock/initMockData';

/** 结论筛选条件 */
export interface ConclusionFilter {
  /** 关联批号ID */
  batchId?: string;
  /** 结论类型筛选 */
  type?: ConclusionRecord['type'];
  /** 状态筛选 */
  status?: ConclusionRecord['status'];
  /** 是否仅显示重复结论 */
  onlyDuplicates?: boolean;
  /** 是否排除已撤销的结论 */
  excludeRevoked?: boolean;
  /** 结论人筛选 */
  concludedBy?: string;
  /** 时间范围 */
  dateRange?: { start: string; end: string };
  /** 关键字搜索（标题、内容） */
  keyword?: string;
}

/** 结论 Store 状态与操作 */
interface ConclusionStoreState {
  // ========== 数据状态 ==========
  /** 结论记录列表 */
  conclusionRecords: ConclusionRecord[];

  // ========== 筛选状态 ==========
  /** 筛选条件 */
  filter: ConclusionFilter;
  /** 当前查看的结论ID */
  viewingConclusionId: string | null;

  // ========== UI 状态 ==========
  /** 是否加载中 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 是否显示编辑对话框 */
  showDialog: boolean;
  /** 编辑中的结论（null为新增模式） */
  editingConclusion: ConclusionRecord | null;

  // ========== 数据加载 ==========
  /**
   * 从localStorage加载数据
   */
  loadRecords: () => void;
  /**
   * 刷新数据
   */
  refresh: () => void;

  // ========== 筛选操作 ==========
  /**
   * 设置筛选条件
   * @param filter 筛选条件
   */
  setFilter: (filter: Partial<ConclusionFilter>) => void;
  /**
   * 清除筛选条件
   */
  clearFilter: () => void;
  /**
   * 设置当前查看的结论
   * @param id 结论ID
   */
  setViewingConclusion: (id: string | null) => void;

  // ========== UI 控制 ==========
  /**
   * 打开新增结论对话框
   * @param batchId 关联的批号ID（可选）
   */
  openCreateDialog: (batchId?: string) => void;
  /**
   * 打开编辑结论对话框
   * @param record 要编辑的结论
   */
  openEditDialog: (record: ConclusionRecord) => void;
  /**
   * 关闭对话框
   */
  closeDialog: () => void;

  // ========== CRUD 操作 ==========
  /**
   * 新增结论（自动检测是否重复）
   * @param record 结论数据
   * @returns 新结论ID
   */
  createConclusion: (
    record: Omit<ConclusionRecord, 'id' | 'concludedAt' | 'isDuplicate' | 'duplicateOfId'>
  ) => string;
  /**
   * 更新结论（仅草稿状态）
   * @param id 结论ID
   * @param updates 更新字段
   * @returns 是否成功
   */
  updateConclusion: (id: string, updates: Partial<ConclusionRecord>) => boolean;
  /**
   * 发布结论（草稿 → 已发布）
   * @param id 结论ID
   * @param approver 审批人
   */
  publishConclusion: (id: string, approver: string) => boolean;
  /**
   * 撤销结论（已发布 → 已撤销）
   * @param id 结论ID
   * @param reason 撤销原因
   */
  revokeConclusion: (id: string, reason: string) => boolean;
  /**
   * 删除结论（仅草稿或已撤销）
   * @param id 结论ID
   * @returns 是否成功
   */
  deleteConclusion: (id: string) => boolean;
  /**
   * 标记重复结论
   * @param duplicateId 被判定为重复的结论ID
   * @param originalId 原始结论ID
   */
  markDuplicate: (duplicateId: string, originalId: string) => void;
  /**
   * 取消重复标记
   * @param id 结论ID
   */
  unmarkDuplicate: (id: string) => void;

  // ========== 查询方法 ==========
  /**
   * 获取筛选后的结论列表（按时间倒序）
   */
  getFilteredRecords: () => ConclusionRecord[];
  /**
   * 获取指定批号的所有结论
   * @param batchId 批号ID
   * @param excludeRevoked 是否排除已撤销
   */
  getByBatchId: (batchId: string, excludeRevoked?: boolean) => ConclusionRecord[];
  /**
   * 根据ID获取结论详情
   * @param id 结论ID
   */
  getById: (id: string) => ConclusionRecord | undefined;
  /**
   * 获取指定结论的重复结论组
   * @param id 结论ID
   */
  getDuplicateGroup: (id: string) => ConclusionRecord[];
  /**
   * 检测新结论是否与现有结论可能重复
   * @param batchId 批号ID
   * @param title 结论标题
   * @returns 疑似重复的结论列表
   */
  detectPotentialDuplicates: (batchId: string, title: string) => ConclusionRecord[];
  /**
   * 获取统计信息
   */
  getStatistics: () => {
    totalRecords: number;
    typeCounts: Record<ConclusionRecord['type'], number>;
    statusCounts: Record<ConclusionRecord['status'], number>;
    duplicateCount: number;
    batchWithConclusions: number;
  };
}

/** 生成唯一ID */
function genId(): string {
  return `conclusion-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

/** 持久化 */
function saveToStorage(records: ConclusionRecord[]) {
  setStorageData(STORAGE_KEYS.CONCLUSION_RECORDS, records);
}

export const useConclusionStore = create<ConclusionStoreState>()(
  persistMiddleware(
    (set, get) => ({
      // ========== 初始状态 ==========
      conclusionRecords: [],
      filter: { excludeRevoked: false },
      viewingConclusionId: null,
      isLoading: false,
      error: null,
      showDialog: false,
      editingConclusion: null,

      // ========== 数据加载 ==========
      loadRecords: () => {
        set({ isLoading: true });
        try {
          const records = getStorageData<ConclusionRecord[]>(STORAGE_KEYS.CONCLUSION_RECORDS, []);
          set({ conclusionRecords: records, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '加载结论记录失败',
            isLoading: false
          });
        }
      },

      refresh: () => {
        const records = getStorageData<ConclusionRecord[]>(STORAGE_KEYS.CONCLUSION_RECORDS, []);
        set({ conclusionRecords: records });
      },

      // ========== 筛选操作 ==========
      setFilter: (filter) => {
        set((state) => ({
          filter: { ...state.filter, ...filter }
        }));
      },

      clearFilter: () => {
        set({ filter: { excludeRevoked: false } });
      },

      setViewingConclusion: (id) => {
        set({ viewingConclusionId: id });
      },

      // ========== UI 控制 ==========
      openCreateDialog: (batchId) => {
        set({
          showDialog: true,
          editingConclusion: batchId
            ? {
                id: '',
                batchId,
                sampleIds: [],
                title: '',
                content: '',
                type: '合格',
                concludedBy: '',
                concludedAt: '',
                isDuplicate: false,
                status: '草稿'
              }
            : null
        });
      },

      openEditDialog: (record) => {
        set({
          showDialog: true,
          editingConclusion: record
        });
      },

      closeDialog: () => {
        set({
          showDialog: false,
          editingConclusion: null
        });
      },

      // ========== CRUD 操作 ==========
      createConclusion: (record) => {
        const now = new Date().toISOString();
        const newId = genId();

        const existing = get().detectPotentialDuplicates(record.batchId, record.title);
        const isDuplicate = existing.length > 0;
        const duplicateOfId = isDuplicate ? existing[0].id : undefined;

        const newRecord: ConclusionRecord = {
          ...record,
          id: newId,
          concludedAt: now,
          isDuplicate,
          duplicateOfId
        };

        set((state) => {
          const newRecords = [...state.conclusionRecords, newRecord];
          saveToStorage(newRecords);
          return {
            conclusionRecords: newRecords,
            showDialog: false,
            editingConclusion: null
          };
        });
        return newId;
      },

      updateConclusion: (id, updates) => {
        const record = get().getById(id);
        if (!record || record.status !== '草稿') {
          return false;
        }
        set((state) => {
          const newRecords = state.conclusionRecords.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          );
          saveToStorage(newRecords);
          return { conclusionRecords: newRecords };
        });
        return true;
      },

      publishConclusion: (id, approver) => {
        const record = get().getById(id);
        if (!record || record.status !== '草稿') {
          return false;
        }
        const now = new Date().toISOString();
        set((state) => {
          const newRecords = state.conclusionRecords.map((r) =>
            r.id === id
              ? { ...r, status: '已发布' as const, approvedBy: approver, approvedAt: now }
              : r
          );
          saveToStorage(newRecords);
          return { conclusionRecords: newRecords };
        });
        return true;
      },

      revokeConclusion: (id, _reason) => {
        const record = get().getById(id);
        if (!record || record.status !== '已发布') {
          return false;
        }
        set((state) => {
          const newRecords = state.conclusionRecords.map((r) =>
            r.id === id ? { ...r, status: '已撤销' as const } : r
          );
          saveToStorage(newRecords);
          return { conclusionRecords: newRecords };
        });
        return true;
      },

      deleteConclusion: (id) => {
        const record = get().getById(id);
        if (!record || (record.status !== '草稿' && record.status !== '已撤销')) {
          return false;
        }
        set((state) => {
          const newRecords = state.conclusionRecords.filter((r) => r.id !== id);
          saveToStorage(newRecords);
          return {
            conclusionRecords: newRecords,
            viewingConclusionId: state.viewingConclusionId === id ? null : state.viewingConclusionId
          };
        });
        return true;
      },

      markDuplicate: (duplicateId, originalId) => {
        set((state) => {
          const newRecords = state.conclusionRecords.map((r) =>
            r.id === duplicateId
              ? { ...r, isDuplicate: true, duplicateOfId: originalId }
              : r
          );
          saveToStorage(newRecords);
          return { conclusionRecords: newRecords };
        });
      },

      unmarkDuplicate: (id) => {
        set((state) => {
          const newRecords = state.conclusionRecords.map((r) =>
            r.id === id ? { ...r, isDuplicate: false, duplicateOfId: undefined } : r
          );
          saveToStorage(newRecords);
          return { conclusionRecords: newRecords };
        });
      },

      // ========== 查询方法 ==========
      getFilteredRecords: () => {
        const { conclusionRecords, filter } = get();
        return conclusionRecords
          .filter((record) => {
            if (filter.batchId && record.batchId !== filter.batchId) return false;
            if (filter.type && record.type !== filter.type) return false;
            if (filter.status && record.status !== filter.status) return false;
            if (filter.onlyDuplicates && !record.isDuplicate) return false;
            if (filter.excludeRevoked && record.status === '已撤销') return false;
            if (filter.concludedBy && record.concludedBy !== filter.concludedBy) return false;
            if (filter.dateRange) {
              const { start, end } = filter.dateRange;
              if (start && record.concludedAt < start) return false;
              if (end && record.concludedAt > end + 'T23:59:59.999Z') return false;
            }
            if (filter.keyword) {
              const kw = filter.keyword.toLowerCase();
              const text = (record.title + ' ' + record.content).toLowerCase();
              if (!text.includes(kw)) return false;
            }
            return true;
          })
          .sort((a, b) => new Date(b.concludedAt).getTime() - new Date(a.concludedAt).getTime());
      },

      getByBatchId: (batchId, excludeRevoked = true) => {
        return get()
          .conclusionRecords.filter(
            (r) => r.batchId === batchId && !(excludeRevoked && r.status === '已撤销')
          )
          .sort((a, b) => new Date(b.concludedAt).getTime() - new Date(a.concludedAt).getTime());
      },

      getById: (id) => {
        return get().conclusionRecords.find((r) => r.id === id);
      },

      getDuplicateGroup: (id) => {
        const record = get().getById(id);
        if (!record) return [];
        const originalId = record.duplicateOfId ?? id;
        return get().conclusionRecords.filter(
          (r) => r.id === originalId || r.duplicateOfId === originalId
        );
      },

      detectPotentialDuplicates: (batchId, title) => {
        const normalize = (s: string) =>
          s.toLowerCase().replace(/[【\[\]（）()，,\s]/g, '').replace(/重复|dup/gi, '');
        const normalizedTitle = normalize(title);
        return get().conclusionRecords.filter((r) => {
          if (r.batchId !== batchId) return false;
          if (r.status === '已撤销') return false;
          const existingNormalized = normalize(r.title);
          return (
            existingNormalized.includes(normalizedTitle) ||
            normalizedTitle.includes(existingNormalized) ||
            existingNormalized === normalizedTitle
          );
        });
      },

      getStatistics: () => {
        const { conclusionRecords } = get();
        const typeCounts = {
          合格: 0,
          不合格: 0,
          有条件合格: 0,
          需复检: 0
        } as Record<ConclusionRecord['type'], number>;
        const statusCounts = {
          草稿: 0,
          已发布: 0,
          已撤销: 0
        } as Record<ConclusionRecord['status'], number>;
        const batchSet = new Set<string>();
        let duplicateCount = 0;

        for (const r of conclusionRecords) {
          typeCounts[r.type]++;
          statusCounts[r.status]++;
          batchSet.add(r.batchId);
          if (r.isDuplicate) duplicateCount++;
        }

        return {
          totalRecords: conclusionRecords.length,
          typeCounts,
          statusCounts,
          duplicateCount,
          batchWithConclusions: batchSet.size
        };
      }
    }),
    {
      name: 'conclusion-store-storage',
      partialize: (state) => ({
        conclusionRecords: state.conclusionRecords,
        filter: state.filter
      })
    }
  )
);
