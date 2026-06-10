/**
 * 异常记录状态管理 Store
 * 管理检测过程中的异常事件，支持上报、处理、关闭等流程
 */

import { create } from 'zustand';
import { persist as persistMiddleware } from 'zustand/middleware';
import type { AnomalyRecord } from '@/mock/sampleData';
import {
  STORAGE_KEYS,
  getStorageData,
  setStorageData
} from '@/mock/initMockData';

/** 异常记录筛选条件 */
export interface AnomalyFilter {
  /** 关联批号ID */
  batchId?: string;
  /** 关联样本ID */
  sampleId?: string;
  /** 异常类型筛选 */
  anomalyType?: AnomalyRecord['anomalyType'];
  /** 严重程度筛选 */
  severity?: AnomalyRecord['severity'];
  /** 处理状态筛选 */
  status?: AnomalyRecord['status'];
  /** 上报人筛选 */
  reportedBy?: string;
  /** 处理人筛选 */
  resolvedBy?: string;
  /** 时间范围 */
  dateRange?: { start: string; end: string };
  /** 关键字搜索（标题、描述、处理措施等） */
  keyword?: string;
}

/** 异常 Store 状态与操作 */
interface AnomalyStoreState {
  // ========== 数据状态 ==========
  /** 异常记录列表 */
  anomalyRecords: AnomalyRecord[];

  // ========== 筛选状态 ==========
  /** 筛选条件 */
  filter: AnomalyFilter;
  /** 当前查看的异常ID */
  viewingAnomalyId: string | null;

  // ========== UI 状态 ==========
  /** 是否加载中 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 是否显示编辑对话框 */
  showDialog: boolean;
  /** 编辑中的异常（null为新增模式） */
  editingAnomaly: AnomalyRecord | null;
  /** 是否显示处理对话框 */
  showResolveDialog: boolean;

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
  setFilter: (filter: Partial<AnomalyFilter>) => void;
  /**
   * 清除筛选条件
   */
  clearFilter: () => void;
  /**
   * 设置当前查看的异常记录
   * @param id 记录ID
   */
  setViewingAnomaly: (id: string | null) => void;

  // ========== UI 控制 ==========
  /**
   * 打开新增异常对话框
   * @param presetData 预设数据（批号ID、样本ID等）
   */
  openCreateDialog: (presetData?: { batchId?: string; sampleId?: string }) => void;
  /**
   * 打开编辑异常对话框
   * @param record 要编辑的记录
   */
  openEditDialog: (record: AnomalyRecord) => void;
  /**
   * 关闭异常编辑对话框
   */
  closeDialog: () => void;
  /**
   * 打开处理对话框
   */
  openResolveDialog: () => void;
  /**
   * 关闭处理对话框
   */
  closeResolveDialog: () => void;

  // ========== CRUD 操作 ==========
  /**
   * 上报异常（新增记录，状态为待处理）
   * @param record 异常数据
   * @returns 新记录ID
   */
  reportAnomaly: (
    record: Omit<AnomalyRecord, 'id' | 'reportedAt' | 'status'> & { status?: AnomalyRecord['status'] }
  ) => string;
  /**
   * 更新异常记录（仅待处理/处理中）
   * @param id 记录ID
   * @param updates 更新字段
   * @returns 是否成功
   */
  updateAnomaly: (id: string, updates: Partial<AnomalyRecord>) => boolean;
  /**
   * 开始处理异常（状态从待处理 → 处理中）
   * @param id 记录ID
   * @param processor 处理人
   * @param initResolution 初步处理措施
   */
  startProcessing: (id: string, processor: string, initResolution?: string) => boolean;
  /**
   * 解决异常（状态从处理中 → 已解决）
   * @param id 记录ID
   * @param resolver 解决人
   * @param resolution 解决措施
   */
  resolveAnomaly: (id: string, resolver: string, resolution: string) => boolean;
  /**
   * 关闭异常记录
   * @param id 记录ID
   * @param closer 关闭人
   * @param closeRemark 关闭备注
   */
  closeAnomaly: (id: string, closer: string, closeRemark?: string) => boolean;
  /**
   * 删除异常记录（仅待处理状态）
   * @param id 记录ID
   * @returns 是否成功
   */
  deleteAnomaly: (id: string) => boolean;
  /**
   * 添加附件
   * @param id 记录ID
   * @param attachment 附件名
   */
  addAttachment: (id: string, attachment: string) => void;
  /**
   * 移除附件
   * @param id 记录ID
   * @param attachment 附件名
   */
  removeAttachment: (id: string, attachment: string) => void;

  // ========== 查询方法 ==========
  /**
   * 获取筛选后的异常列表（按严重程度优先，再按时间倒序）
   */
  getFilteredRecords: () => AnomalyRecord[];
  /**
   * 获取指定批号的所有异常
   * @param batchId 批号ID
   * @param excludeClosed 是否排除已关闭
   */
  getByBatchId: (batchId: string, excludeClosed?: boolean) => AnomalyRecord[];
  /**
   * 获取指定样本的所有异常
   * @param sampleId 样本ID
   */
  getBySampleId: (sampleId: string) => AnomalyRecord[];
  /**
   * 根据ID获取异常详情
   * @param id 记录ID
   */
  getById: (id: string) => AnomalyRecord | undefined;
  /**
   * 获取统计信息
   */
  getStatistics: () => {
    totalRecords: number;
    typeCounts: Record<AnomalyRecord['anomalyType'], number>;
    severityCounts: Record<AnomalyRecord['severity'], number>;
    statusCounts: Record<AnomalyRecord['status'], number>;
    pendingCount: number;
    processingCount: number;
    urgentCount: number;
    overdueCount: number; // 超过3天未关闭的严重/紧急
  };
}

/** 生成唯一ID */
function genId(): string {
  return `anomaly-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

/** 持久化 */
function saveToStorage(records: AnomalyRecord[]) {
  setStorageData(STORAGE_KEYS.ANOMALY_RECORDS, records);
}

/** 严重程度排序权重 */
const SEVERITY_WEIGHT: Record<AnomalyRecord['severity'], number> = {
  紧急: 3,
  严重: 2,
  一般: 1
};

export const useAnomalyStore = create<AnomalyStoreState>()(
  persistMiddleware(
    (set, get) => ({
      // ========== 初始状态 ==========
      anomalyRecords: [],
      filter: {},
      viewingAnomalyId: null,
      isLoading: false,
      error: null,
      showDialog: false,
      editingAnomaly: null,
      showResolveDialog: false,

      // ========== 数据加载 ==========
      loadRecords: () => {
        set({ isLoading: true });
        try {
          const records = getStorageData<AnomalyRecord[]>(STORAGE_KEYS.ANOMALY_RECORDS, []);
          set({ anomalyRecords: records, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '加载异常记录失败',
            isLoading: false
          });
        }
      },

      refresh: () => {
        const records = getStorageData<AnomalyRecord[]>(STORAGE_KEYS.ANOMALY_RECORDS, []);
        set({ anomalyRecords: records });
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

      setViewingAnomaly: (id) => {
        set({ viewingAnomalyId: id });
      },

      // ========== UI 控制 ==========
      openCreateDialog: (presetData) => {
        set({
          showDialog: true,
          editingAnomaly: presetData
            ? {
                id: '',
                batchId: presetData.batchId,
                sampleId: presetData.sampleId,
                anomalyType: '数据异常',
                severity: '一般',
                title: '',
                description: '',
                reportedBy: '',
                reportedAt: '',
                status: '待处理',
                attachments: []
              }
            : null
        });
      },

      openEditDialog: (record) => {
        set({
          showDialog: true,
          editingAnomaly: record
        });
      },

      closeDialog: () => {
        set({
          showDialog: false,
          editingAnomaly: null
        });
      },

      openResolveDialog: () => {
        set({ showResolveDialog: true });
      },

      closeResolveDialog: () => {
        set({ showResolveDialog: false });
      },

      // ========== CRUD 操作 ==========
      reportAnomaly: (record) => {
        const now = new Date().toISOString();
        const newRecord: AnomalyRecord = {
          ...record,
          id: genId(),
          reportedAt: now,
          status: record.status ?? '待处理'
        };
        set((state) => {
          const newRecords = [...state.anomalyRecords, newRecord];
          saveToStorage(newRecords);
          return {
            anomalyRecords: newRecords,
            showDialog: false,
            editingAnomaly: null
          };
        });
        return newRecord.id;
      },

      updateAnomaly: (id, updates) => {
        const record = get().getById(id);
        if (!record || (record.status !== '待处理' && record.status !== '处理中')) {
          return false;
        }
        set((state) => {
          const newRecords = state.anomalyRecords.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          );
          saveToStorage(newRecords);
          return { anomalyRecords: newRecords };
        });
        return true;
      },

      startProcessing: (id, processor, initResolution) => {
        const record = get().getById(id);
        if (!record || record.status !== '待处理') {
          return false;
        }
        set((state) => {
          const newRecords = state.anomalyRecords.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: '处理中' as const,
                  resolution: initResolution ?? r.resolution
                }
              : r
          );
          saveToStorage(newRecords);
          return { anomalyRecords: newRecords };
        });
        return true;
      },

      resolveAnomaly: (id, resolver, resolution) => {
        const record = get().getById(id);
        if (!record || record.status !== '处理中') {
          return false;
        }
        const now = new Date().toISOString();
        set((state) => {
          const newRecords = state.anomalyRecords.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: '已解决' as const,
                  resolution,
                  resolvedBy: resolver,
                  resolvedAt: now
                }
              : r
          );
          saveToStorage(newRecords);
          return {
            anomalyRecords: newRecords,
            showResolveDialog: false
          };
        });
        return true;
      },

      closeAnomaly: (id, _closer, _closeRemark) => {
        const record = get().getById(id);
        if (!record || record.status !== '已解决') {
          return false;
        }
        set((state) => {
          const newRecords = state.anomalyRecords.map((r) =>
            r.id === id ? { ...r, status: '已关闭' as const } : r
          );
          saveToStorage(newRecords);
          return { anomalyRecords: newRecords };
        });
        return true;
      },

      deleteAnomaly: (id) => {
        const record = get().getById(id);
        if (!record || record.status !== '待处理') {
          return false;
        }
        set((state) => {
          const newRecords = state.anomalyRecords.filter((r) => r.id !== id);
          saveToStorage(newRecords);
          return {
            anomalyRecords: newRecords,
            viewingAnomalyId: state.viewingAnomalyId === id ? null : state.viewingAnomalyId
          };
        });
        return true;
      },

      addAttachment: (id, attachment) => {
        set((state) => {
          const newRecords = state.anomalyRecords.map((r) =>
            r.id === id
              ? {
                  ...r,
                  attachments: [...(r.attachments ?? []), attachment]
                }
              : r
          );
          saveToStorage(newRecords);
          return { anomalyRecords: newRecords };
        });
      },

      removeAttachment: (id, attachment) => {
        set((state) => {
          const newRecords = state.anomalyRecords.map((r) =>
            r.id === id
              ? {
                  ...r,
                  attachments: (r.attachments ?? []).filter((a) => a !== attachment)
                }
              : r
          );
          saveToStorage(newRecords);
          return { anomalyRecords: newRecords };
        });
      },

      // ========== 查询方法 ==========
      getFilteredRecords: () => {
        const { anomalyRecords, filter } = get();
        return anomalyRecords
          .filter((record) => {
            if (filter.batchId && record.batchId !== filter.batchId) return false;
            if (filter.sampleId && record.sampleId !== filter.sampleId) return false;
            if (filter.anomalyType && record.anomalyType !== filter.anomalyType) return false;
            if (filter.severity && record.severity !== filter.severity) return false;
            if (filter.status && record.status !== filter.status) return false;
            if (filter.reportedBy && record.reportedBy !== filter.reportedBy) return false;
            if (filter.resolvedBy && record.resolvedBy !== filter.resolvedBy) return false;
            if (filter.dateRange) {
              const { start, end } = filter.dateRange;
              if (start && record.reportedAt < start) return false;
              if (end && record.reportedAt > end + 'T23:59:59.999Z') return false;
            }
            if (filter.keyword) {
              const kw = filter.keyword.toLowerCase();
              const text = [
                record.title,
                record.description,
                record.resolution ?? ''
              ].join(' ').toLowerCase();
              if (!text.includes(kw)) return false;
            }
            return true;
          })
          .sort((a, b) => {
            const weightDiff = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
            if (weightDiff !== 0) return weightDiff;
            return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
          });
      },

      getByBatchId: (batchId, excludeClosed = false) => {
        return get()
          .anomalyRecords.filter(
            (r) => r.batchId === batchId && !(excludeClosed && r.status === '已关闭')
          )
          .sort((a, b) => {
            const weightDiff = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
            if (weightDiff !== 0) return weightDiff;
            return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
          });
      },

      getBySampleId: (sampleId) => {
        return get()
          .anomalyRecords.filter((r) => r.sampleId === sampleId)
          .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
      },

      getById: (id) => {
        return get().anomalyRecords.find((r) => r.id === id);
      },

      getStatistics: () => {
        const { anomalyRecords } = get();
        const typeCounts = {
          数据异常: 0,
          设备异常: 0,
          环境异常: 0,
          试剂异常: 0,
          操作异常: 0
        } as Record<AnomalyRecord['anomalyType'], number>;
        const severityCounts = {
          一般: 0,
          严重: 0,
          紧急: 0
        } as Record<AnomalyRecord['severity'], number>;
        const statusCounts = {
          待处理: 0,
          处理中: 0,
          已解决: 0,
          已关闭: 0
        } as Record<AnomalyRecord['status'], number>;
        let urgentCount = 0;
        let overdueCount = 0;
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

        for (const r of anomalyRecords) {
          typeCounts[r.anomalyType]++;
          severityCounts[r.severity]++;
          statusCounts[r.status]++;
          if (r.severity === '紧急') urgentCount++;
          if (
            (r.severity === '严重' || r.severity === '紧急') &&
            (r.status === '待处理' || r.status === '处理中') &&
            r.reportedAt < threeDaysAgo
          ) {
            overdueCount++;
          }
        }

        return {
          totalRecords: anomalyRecords.length,
          typeCounts,
          severityCounts,
          statusCounts,
          pendingCount: statusCounts['待处理'],
          processingCount: statusCounts['处理中'],
          urgentCount,
          overdueCount
        };
      }
    }),
    {
      name: 'anomaly-store-storage',
      partialize: (state) => ({
        anomalyRecords: state.anomalyRecords,
        filter: state.filter
      })
    }
  )
);
