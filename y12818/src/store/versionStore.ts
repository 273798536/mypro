/**
 * 版本历史状态管理 Store
 * 管理审计追踪的版本记录，支持按实体、按时间、按操作人查询
 */

import { create } from 'zustand';
import { persist as persistMiddleware } from 'zustand/middleware';
import type { VersionRecord } from '@/mock/sampleData';
import {
  STORAGE_KEYS,
  getStorageData,
  setStorageData
} from '@/mock/initMockData';

/** 版本记录筛选条件 */
export interface VersionFilter {
  /** 实体类型筛选 */
  entityType?: VersionRecord['entityType'];
  /** 关联实体ID */
  entityId?: string;
  /** 操作类型筛选 */
  operation?: VersionRecord['operation'];
  /** 操作人筛选 */
  operator?: string;
  /** 操作时间范围 */
  dateRange?: { start: string; end: string };
  /** 变更字段关键字搜索 */
  fieldKeyword?: string;
}

/** 版本 Store 状态与操作 */
interface VersionStoreState {
  // ========== 数据状态 ==========
  /** 版本记录列表 */
  versionRecords: VersionRecord[];

  // ========== 筛选状态 ==========
  /** 筛选条件 */
  filter: VersionFilter;
  /** 当前查看的实体ID（用于版本对比） */
  viewingEntityId: string | null;

  // ========== UI 状态 ==========
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;

  // ========== 数据加载 ==========
  /**
   * 从localStorage加载版本记录
   */
  loadRecords: () => void;
  /**
   * 刷新数据（从localStorage重新读取）
   */
  refresh: () => void;

  // ========== 筛选操作 ==========
  /**
   * 设置筛选条件
   * @param filter 筛选条件
   */
  setFilter: (filter: Partial<VersionFilter>) => void;
  /**
   * 清除筛选条件
   */
  clearFilter: () => void;
  /**
   * 设置当前查看的实体ID
   * @param entityId 实体ID
   */
  setViewingEntity: (entityId: string | null) => void;

  // ========== CRUD 操作 ==========
  /**
   * 新增版本记录（一般由其他Store调用，不直接手动创建）
   * @param record 版本记录数据
   */
  addVersionRecord: (
    record: Omit<VersionRecord, 'id' | 'operatedAt'> & { operatedAt?: string }
  ) => void;
  /**
   * 批量添加版本记录
   * @param records 版本记录列表
   */
  addVersionRecords: (
    records: Array<Omit<VersionRecord, 'id' | 'operatedAt'> & { operatedAt?: string }>
  ) => void;

  // ========== 查询方法 ==========
  /**
   * 获取筛选后的版本记录列表（按时间倒序）
   */
  getFilteredRecords: () => VersionRecord[];
  /**
   * 获取指定实体的完整版本历史（按版本号升序）
   * @param entityType 实体类型
   * @param entityId 实体ID
   */
  getEntityHistory: (entityType: VersionRecord['entityType'], entityId: string) => VersionRecord[];
  /**
   * 获取指定实体的最新版本记录
   * @param entityType 实体类型
   * @param entityId 实体ID
   */
  getLatestVersion: (entityType: VersionRecord['entityType'], entityId: string) => VersionRecord | undefined;
  /**
   * 对比两个版本的差异（返回字段级变更说明）
   * @param version1 版本记录1
   * @param version2 版本记录2
   */
  compareVersions: (
    version1: VersionRecord,
    version2: VersionRecord
  ) => Array<{ field: string; before: unknown; after: unknown }>;
  /**
   * 获取版本统计
   */
  getStatistics: () => {
    totalRecords: number;
    operationCounts: Record<VersionRecord['operation'], number>;
    entityTypeCounts: Record<VersionRecord['entityType'], number>;
    operatorCounts: Record<string, number>;
    todayRecords: number;
  };
}

/** 生成唯一ID */
function genId(): string {
  return `ver-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

/** 持久化到localStorage */
function saveToStorage(records: VersionRecord[]) {
  setStorageData(STORAGE_KEYS.VERSION_RECORDS, records);
}

export const useVersionStore = create<VersionStoreState>()(
  persistMiddleware(
    (set, get) => ({
      // ========== 初始状态 ==========
      versionRecords: [],
      filter: {},
      viewingEntityId: null,
      isLoading: false,
      error: null,

      // ========== 数据加载 ==========
      loadRecords: () => {
        set({ isLoading: true });
        try {
          const records = getStorageData<VersionRecord[]>(STORAGE_KEYS.VERSION_RECORDS, []);
          set({ versionRecords: records, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '加载版本记录失败',
            isLoading: false
          });
        }
      },

      refresh: () => {
        const records = getStorageData<VersionRecord[]>(STORAGE_KEYS.VERSION_RECORDS, []);
        set({ versionRecords: records });
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

      setViewingEntity: (entityId) => {
        set({
          viewingEntityId: entityId,
          filter: entityId
            ? { ...get().filter, entityId }
            : { ...get().filter, entityId: undefined }
        });
      },

      // ========== CRUD 操作 ==========
      addVersionRecord: (record) => {
        const now = new Date().toISOString();
        const newRecord: VersionRecord = {
          ...record,
          id: genId(),
          operatedAt: record.operatedAt ?? now
        };
        set((state) => {
          const newRecords = [...state.versionRecords, newRecord];
          saveToStorage(newRecords);
          return { versionRecords: newRecords };
        });
      },

      addVersionRecords: (records) => {
        const now = new Date().toISOString();
        const newRecords = records.map((r) => ({
          ...r,
          id: genId(),
          operatedAt: r.operatedAt ?? now
        }));
        set((state) => {
          const merged = [...state.versionRecords, ...newRecords];
          saveToStorage(merged);
          return { versionRecords: merged };
        });
      },

      // ========== 查询方法 ==========
      getFilteredRecords: () => {
        const { versionRecords, filter } = get();
        return versionRecords
          .filter((record) => {
            if (filter.entityType && record.entityType !== filter.entityType) return false;
            if (filter.entityId && record.entityId !== filter.entityId) return false;
            if (filter.operation && record.operation !== filter.operation) return false;
            if (filter.operator && record.operator !== filter.operator) return false;
            if (filter.dateRange) {
              const { start, end } = filter.dateRange;
              if (start && record.operatedAt < start) return false;
              if (end && record.operatedAt > end + 'T23:59:59.999Z') return false;
            }
            if (filter.fieldKeyword) {
              const kw = filter.fieldKeyword.toLowerCase();
              const matchFields = record.changedFields.join(',').toLowerCase();
              if (!matchFields.includes(kw)) return false;
            }
            return true;
          })
          .sort((a, b) => new Date(b.operatedAt).getTime() - new Date(a.operatedAt).getTime());
      },

      getEntityHistory: (entityType, entityId) => {
        return get()
          .versionRecords.filter(
            (r) => r.entityType === entityType && r.entityId === entityId
          )
          .sort((a, b) => a.versionNo - b.versionNo);
      },

      getLatestVersion: (entityType, entityId) => {
        const history = get().getEntityHistory(entityType, entityId);
        return history.length > 0 ? history[history.length - 1] : undefined;
      },

      compareVersions: (version1, version2) => {
        const diffs: Array<{ field: string; before: unknown; after: unknown }> = [];
        try {
          const before = version1.afterSnapshot ? JSON.parse(version1.afterSnapshot) : {};
          const after = version2.afterSnapshot ? JSON.parse(version2.afterSnapshot) : {};
          const allFields = new Set([...Object.keys(before), ...Object.keys(after)]);
          for (const field of allFields) {
            if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
              diffs.push({
                field,
                before: before[field] ?? null,
                after: after[field] ?? null
              });
            }
          }
        } catch {
          // JSON解析失败时，直接使用changedFields
          for (const field of version2.changedFields) {
            if (field !== '*') {
              diffs.push({ field, before: '变更前', after: '变更后' });
            }
          }
        }
        return diffs;
      },

      getStatistics: () => {
        const { versionRecords } = get();
        const operationCounts = {
          创建: 0,
          修改: 0,
          删除: 0,
          审核: 0,
          修正: 0
        } as Record<VersionRecord['operation'], number>;
        const entityTypeCounts = {
          样本记录: 0,
          培养基批号: 0,
          结论: 0,
          异常记录: 0
        } as Record<VersionRecord['entityType'], number>;
        const operatorCounts: Record<string, number> = {};
        let todayRecords = 0;
        const today = new Date().toISOString().split('T')[0];

        for (const r of versionRecords) {
          operationCounts[r.operation]++;
          entityTypeCounts[r.entityType]++;
          operatorCounts[r.operator] = (operatorCounts[r.operator] ?? 0) + 1;
          if (r.operatedAt.startsWith(today)) {
            todayRecords++;
          }
        }

        return {
          totalRecords: versionRecords.length,
          operationCounts,
          entityTypeCounts,
          operatorCounts,
          todayRecords
        };
      }
    }),
    {
      name: 'version-store-storage',
      partialize: (state) => ({
        versionRecords: state.versionRecords,
        filter: state.filter
      })
    }
  )
);
