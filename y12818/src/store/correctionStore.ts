/**
 * 人工修正记录状态管理 Store
 * 管理样本数据的人工修正申请、审批流程
 */

import { create } from 'zustand';
import { persist as persistMiddleware } from 'zustand/middleware';
import type { CorrectionRecord } from '@/mock/sampleData';
import {
  STORAGE_KEYS,
  getStorageData,
  setStorageData
} from '@/mock/initMockData';

/** 修正记录筛选条件 */
export interface CorrectionFilter {
  /** 关联样本ID */
  sampleId?: string;
  /** 审批状态筛选 */
  approvalStatus?: CorrectionRecord['approvalStatus'];
  /** 修正字段名筛选 */
  fieldName?: string;
  /** 修正人筛选 */
  correctedBy?: string;
  /** 审批人筛选 */
  approvedBy?: string;
  /** 时间范围 */
  dateRange?: { start: string; end: string };
  /** 关键字搜索（原因、前后值等） */
  keyword?: string;
}

/** 人工修正 Store 状态与操作 */
interface CorrectionStoreState {
  // ========== 数据状态 ==========
  /** 修正记录列表 */
  correctionRecords: CorrectionRecord[];

  // ========== 筛选状态 ==========
  /** 筛选条件 */
  filter: CorrectionFilter;
  /** 当前正在查看/编辑的修正记录ID */
  selectedCorrectionId: string | null;

  // ========== UI 状态 ==========
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 是否显示新增/编辑对话框 */
  showDialog: boolean;
  /** 当前编辑的记录 */
  editingRecord: CorrectionRecord | null;

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
  setFilter: (filter: Partial<CorrectionFilter>) => void;
  /**
   * 清除筛选条件
   */
  clearFilter: () => void;
  /**
   * 选择修正记录
   * @param id 记录ID
   */
  selectCorrection: (id: string | null) => void;

  // ========== UI 控制 ==========
  /**
   * 打开新增对话框
   * @param sampleId 关联的样本ID（可选）
   */
  openCreateDialog: (sampleId?: string) => void;
  /**
   * 打开编辑对话框
   * @param record 要编辑的记录
   */
  openEditDialog: (record: CorrectionRecord) => void;
  /**
   * 关闭对话框
   */
  closeDialog: () => void;

  // ========== CRUD 操作 ==========
  /**
   * 提交修正申请
   * @param record 修正记录数据
   */
  submitCorrection: (
    record: Omit<CorrectionRecord, 'id' | 'correctedAt' | 'approvalStatus'>
  ) => void;
  /**
   * 审批修正申请
   * @param id 记录ID
   * @param approve 是否批准
   * @param approver 审批人
   * @param remark 审批意见
   */
  approveCorrection: (id: string, approve: boolean, approver: string, remark?: string) => void;
  /**
   * 更新修正记录（仅待审批状态可更新）
   * @param id 记录ID
   * @param updates 更新字段
   */
  updateCorrection: (id: string, updates: Partial<CorrectionRecord>) => boolean;
  /**
   * 删除修正记录（仅待审批状态可删除）
   * @param id 记录ID
   */
  deleteCorrection: (id: string) => boolean;

  // ========== 查询方法 ==========
  /**
   * 获取筛选后的记录列表（按时间倒序）
   */
  getFilteredRecords: () => CorrectionRecord[];
  /**
   * 获取指定样本的所有修正记录
   * @param sampleId 样本ID
   */
  getBySampleId: (sampleId: string) => CorrectionRecord[];
  /**
   * 根据ID获取修正记录详情
   * @param id 记录ID
   */
  getById: (id: string) => CorrectionRecord | undefined;
  /**
   * 获取统计信息
   */
  getStatistics: () => {
    totalRecords: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    fieldNameCounts: Record<string, number>;
    correctorCounts: Record<string, number>;
    myPendingCount: number; // 待我审批（简化：等于pendingCount）
  };
}

/** 生成唯一ID */
function genId(): string {
  return `correction-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

/** 持久化 */
function saveToStorage(records: CorrectionRecord[]) {
  setStorageData(STORAGE_KEYS.CORRECTION_RECORDS, records);
}

export const useCorrectionStore = create<CorrectionStoreState>()(
  persistMiddleware(
    (set, get) => ({
      // ========== 初始状态 ==========
      correctionRecords: [],
      filter: {},
      selectedCorrectionId: null,
      isLoading: false,
      error: null,
      showDialog: false,
      editingRecord: null,

      // ========== 数据加载 ==========
      loadRecords: () => {
        set({ isLoading: true });
        try {
          const records = getStorageData<CorrectionRecord[]>(STORAGE_KEYS.CORRECTION_RECORDS, []);
          set({ correctionRecords: records, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '加载修正记录失败',
            isLoading: false
          });
        }
      },

      refresh: () => {
        const records = getStorageData<CorrectionRecord[]>(STORAGE_KEYS.CORRECTION_RECORDS, []);
        set({ correctionRecords: records });
      },

      // ========== 筛选操作 ==========
      setFilter: (filter) => {
        set((state) => ({
          filter: { ...state.filter, ...filter }
        }));
      },

      clearFilter: () => {
        set({ filter: {} });
      },

      selectCorrection: (id) => {
        set({ selectedCorrectionId: id });
      },

      // ========== UI 控制 ==========
      openCreateDialog: (sampleId) => {
        set({
          showDialog: true,
          editingRecord: sampleId
            ? {
                id: '',
                sampleId,
                beforeValue: '',
                afterValue: '',
                fieldName: 'speciesName',
                reason: '',
                correctedBy: '',
                correctedAt: '',
                approvalStatus: '待审批'
              }
            : null
        });
      },

      openEditDialog: (record) => {
        set({
          showDialog: true,
          editingRecord: record
        });
      },

      closeDialog: () => {
        set({
          showDialog: false,
          editingRecord: null
        });
      },

      // ========== CRUD 操作 ==========
      submitCorrection: (record) => {
        const now = new Date().toISOString();
        const newRecord: CorrectionRecord = {
          ...record,
          id: genId(),
          correctedAt: now,
          approvalStatus: '待审批'
        };
        set((state) => {
          const newRecords = [...state.correctionRecords, newRecord];
          saveToStorage(newRecords);
          return {
            correctionRecords: newRecords,
            showDialog: false,
            editingRecord: null
          };
        });
      },

      approveCorrection: (id, approve, approver, remark) => {
        const now = new Date().toISOString();
        set((state) => {
          const newRecords = state.correctionRecords.map((r) =>
            r.id === id
              ? {
                  ...r,
                  approvalStatus: approve ? ('已批准' as const) : ('已驳回' as const),
                  approvedBy: approver,
                  approvedAt: now,
                  approvalRemark: remark
                }
              : r
          );
          saveToStorage(newRecords);
          return { correctionRecords: newRecords };
        });
      },

      updateCorrection: (id, updates) => {
        const record = get().getById(id);
        if (!record || record.approvalStatus !== '待审批') {
          return false;
        }
        set((state) => {
          const newRecords = state.correctionRecords.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          );
          saveToStorage(newRecords);
          return { correctionRecords: newRecords };
        });
        return true;
      },

      deleteCorrection: (id) => {
        const record = get().getById(id);
        if (!record || record.approvalStatus !== '待审批') {
          return false;
        }
        set((state) => {
          const newRecords = state.correctionRecords.filter((r) => r.id !== id);
          saveToStorage(newRecords);
          return {
            correctionRecords: newRecords,
            selectedCorrectionId: state.selectedCorrectionId === id ? null : state.selectedCorrectionId
          };
        });
        return true;
      },

      // ========== 查询方法 ==========
      getFilteredRecords: () => {
        const { correctionRecords, filter } = get();
        return correctionRecords
          .filter((record) => {
            if (filter.sampleId && record.sampleId !== filter.sampleId) return false;
            if (filter.approvalStatus && record.approvalStatus !== filter.approvalStatus) return false;
            if (filter.fieldName && record.fieldName !== filter.fieldName) return false;
            if (filter.correctedBy && record.correctedBy !== filter.correctedBy) return false;
            if (filter.approvedBy && record.approvedBy !== filter.approvedBy) return false;
            if (filter.dateRange) {
              const { start, end } = filter.dateRange;
              if (start && record.correctedAt < start) return false;
              if (end && record.correctedAt > end + 'T23:59:59.999Z') return false;
            }
            if (filter.keyword) {
              const kw = filter.keyword.toLowerCase();
              const text = [
                record.beforeValue,
                record.afterValue,
                record.reason,
                record.approvalRemark ?? ''
              ].join(' ').toLowerCase();
              if (!text.includes(kw)) return false;
            }
            return true;
          })
          .sort((a, b) => new Date(b.correctedAt).getTime() - new Date(a.correctedAt).getTime());
      },

      getBySampleId: (sampleId) => {
        return get()
          .correctionRecords.filter((r) => r.sampleId === sampleId)
          .sort((a, b) => new Date(b.correctedAt).getTime() - new Date(a.correctedAt).getTime());
      },

      getById: (id) => {
        return get().correctionRecords.find((r) => r.id === id);
      },

      getStatistics: () => {
        const { correctionRecords } = get();
        let pendingCount = 0;
        let approvedCount = 0;
        let rejectedCount = 0;
        const fieldNameCounts: Record<string, number> = {};
        const correctorCounts: Record<string, number> = {};

        for (const r of correctionRecords) {
          switch (r.approvalStatus) {
            case '待审批':
              pendingCount++;
              break;
            case '已批准':
              approvedCount++;
              break;
            case '已驳回':
              rejectedCount++;
              break;
          }
          fieldNameCounts[r.fieldName] = (fieldNameCounts[r.fieldName] ?? 0) + 1;
          correctorCounts[r.correctedBy] = (correctorCounts[r.correctedBy] ?? 0) + 1;
        }

        return {
          totalRecords: correctionRecords.length,
          pendingCount,
          approvedCount,
          rejectedCount,
          fieldNameCounts,
          correctorCounts,
          myPendingCount: pendingCount
        };
      }
    }),
    {
      name: 'correction-store-storage',
      partialize: (state) => ({
        correctionRecords: state.correctionRecords,
        filter: state.filter
      })
    }
  )
);
