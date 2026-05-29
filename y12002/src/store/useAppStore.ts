import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  MemberAccount,
  MileageTransaction,
  ExchangeOrder,
  ExpireCalendar,
  LiabilityRecord,
  BadRecord,
  OperationLog,
  LiabilityFilters,
  TraceNode,
  RefreshResult,
  ImportResult,
  ExportConfig,
  Activity,
} from '@/types';
import {
  mockMemberAccounts,
  mockTransactions,
  mockOrders,
  mockExpireCalendars,
  mockLiabilityRecords,
  mockBadRecords,
  mockActivities,
} from '@/data/mockData';
import { BusinessRuleEngine, DataRefreshService } from '@/services/businessRules';
import { ImportService } from '@/services/importService';
import { ExportService } from '@/services/exportService';
import { setStorage, backupData, restoreBackup } from '@/utils/storage';
import { generateId, formatDateTime, generateBatchNo } from '@/utils/date';

interface AppState {
  memberAccounts: MemberAccount[];
  transactions: MileageTransaction[];
  exchangeOrders: ExchangeOrder[];
  expireCalendars: ExpireCalendar[];
  liabilityRecords: LiabilityRecord[];
  badRecords: BadRecord[];
  operationLogs: OperationLog[];
  activities: Activity[];
  currentUser: string;
  loading: boolean;
  filters: LiabilityFilters;
  selectedRecords: string[];
  lastRefreshTime: string | null;
  lastBackupKey: string | null;

  loadInitialData: () => void;
  setFilters: (filters: Partial<LiabilityFilters>) => void;
  resetFilters: () => void;
  toggleSelected: (id: string) => void;
  clearSelected: () => void;
  selectAll: (ids: string[]) => void;

  getFilteredRecords: (includeExpired?: boolean) => LiabilityRecord[];
  getLiabilityById: (id: string) => LiabilityRecord | undefined;
  getBadRecordsBySource: (sourceType?: string) => BadRecord[];
  getExpiredRecords: () => LiabilityRecord[];
  getUpgradeRefundRecords: () => LiabilityRecord[];
  getActivityDoubleRecords: () => LiabilityRecord[];

  importData: (sourceType: string, file: File) => Promise<ImportResult>;
  refreshData: () => Promise<RefreshResult>;
  restoreFromBackup: (backupKey: string) => boolean;

  markReviewed: (recordId: string, comment: string) => void;
  markBatchReviewed: (recordIds: string[], comment: string) => void;
  processExpired: (recordId: string, action: '冲回' | '豁免', comment: string) => void;
  markBadRecordProcessed: (badRecordId: string, processor: string) => void;
  markBatchBadRecordsProcessed: (badRecordIds: string[], processor: string) => void;
  deleteBadRecords: (badRecordIds: string[]) => void;

  getTraceChain: (recordId: string) => TraceNode[];
  exportData: (config: ExportConfig) => Promise<string>;

  addOperationLog: (operation: Omit<OperationLog, 'id' | 'createTime'>) => void;
  generateLiabilityRecords: () => void;
}

const businessRuleEngine = new BusinessRuleEngine();
const dataRefreshService = new DataRefreshService();
const importService = new ImportService();
const exportService = new ExportService();

const initialFilters: LiabilityFilters = {
  memberNo: '',
  memberName: '',
  accountType: [],
  businessCategory: [],
  reviewStatus: [],
  includeExpired: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      memberAccounts: [],
      transactions: [],
      exchangeOrders: [],
      expireCalendars: [],
      liabilityRecords: [],
      badRecords: [],
      operationLogs: [],
      activities: [],
      currentUser: '张会计',
      loading: false,
      filters: initialFilters,
      selectedRecords: [],
      lastRefreshTime: null,
      lastBackupKey: null,

      loadInitialData: () => {
        const existingData = get().liabilityRecords;
        if (existingData.length > 0) return;

        set({
          memberAccounts: mockMemberAccounts,
          transactions: mockTransactions,
          exchangeOrders: mockOrders,
          expireCalendars: mockExpireCalendars,
          liabilityRecords: mockLiabilityRecords,
          badRecords: mockBadRecords,
          activities: mockActivities,
          lastRefreshTime: formatDateTime(new Date()),
        });

        get().addOperationLog({
          operator: '系统',
          operationType: '导入',
          targetType: '初始化数据',
          targetId: 'INIT',
          beforeData: null,
          afterData: { recordCount: mockLiabilityRecords.length },
          detail: '系统初始化加载Mock数据',
        });
      },

      setFilters: (filters) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      resetFilters: () => {
        set({ filters: initialFilters });
      },

      toggleSelected: (id) => {
        set((state) => ({
          selectedRecords: state.selectedRecords.includes(id)
            ? state.selectedRecords.filter(r => r !== id)
            : [...state.selectedRecords, id],
        }));
      },

      clearSelected: () => {
        set({ selectedRecords: [] });
      },

      selectAll: (ids) => {
        set({ selectedRecords: ids });
      },

      getFilteredRecords: (includeExpired = false) => {
        const state = get();
        const records = state.liabilityRecords;
        const filters = state.filters;

        return records.filter(record => {
          if (!includeExpired && !filters.includeExpired && record.isExpired) {
            return false;
          }
          if (filters.memberNo && !record.memberNo.toLowerCase().includes(filters.memberNo.toLowerCase())) {
            return false;
          }
          if (filters.memberName && !record.memberName.includes(filters.memberName)) {
            return false;
          }
          if (filters.accountType && filters.accountType.length > 0 && !filters.accountType.includes(record.accountType)) {
            return false;
          }
          if (filters.minMiles !== undefined && record.remainingMiles < filters.minMiles) {
            return false;
          }
          if (filters.maxMiles !== undefined && record.remainingMiles > filters.maxMiles) {
            return false;
          }
          if (filters.minLiability !== undefined && record.estimatedLiability < filters.minLiability) {
            return false;
          }
          if (filters.maxLiability !== undefined && record.estimatedLiability > filters.maxLiability) {
            return false;
          }
          if (filters.expireDateFrom && record.expireDate && record.expireDate < filters.expireDateFrom) {
            return false;
          }
          if (filters.expireDateTo && record.expireDate && record.expireDate > filters.expireDateTo) {
            return false;
          }
          if (filters.businessCategory && filters.businessCategory.length > 0 && !filters.businessCategory.includes(record.businessCategory)) {
            return false;
          }
          if (filters.reviewStatus && filters.reviewStatus.length > 0 && !filters.reviewStatus.includes(record.reviewStatus)) {
            return false;
          }
          return true;
        });
      },

      getLiabilityById: (id) => {
        return get().liabilityRecords.find(r => r.id === id);
      },

      getBadRecordsBySource: (sourceType) => {
        const records = get().badRecords;
        if (!sourceType) return records;
        return records.filter(r => r.sourceType === sourceType);
      },

      getExpiredRecords: () => {
        return get().liabilityRecords.filter(r => r.isExpired);
      },

      getUpgradeRefundRecords: () => {
        return get().liabilityRecords.filter(r => r.businessCategory === '升舱退回' && !r.isExpired);
      },

      getActivityDoubleRecords: () => {
        return get().liabilityRecords.filter(r => r.businessCategory === '活动双倍' && !r.isExpired);
      },

      importData: async (sourceType, file) => {
        set({ loading: true });
        try {
          const result = await importService.importData(sourceType as any, file);
          
          if (result.success && result.badRecords.length > 0) {
            set((state) => ({
              badRecords: [...state.badRecords, ...result.badRecords],
            }));
          }

          get().addOperationLog({
            operator: get().currentUser,
            operationType: '导入',
            targetType: sourceType,
            targetId: result.batchNo,
            beforeData: null,
            afterData: {
              totalRows: result.totalRows,
              validRows: result.validRows,
              badRows: result.badRows,
            },
            detail: `导入${sourceType}数据文件: ${file.name}`,
          });

          return result;
        } finally {
          set({ loading: false });
        }
      },

      refreshData: async () => {
        set({ loading: true });
        try {
          const backupKey = generateBatchNo('BACKUP');
          backupData(backupKey, {
            liabilityRecords: get().liabilityRecords,
            badRecords: get().badRecords,
          });

          const beforeRecords = get().liabilityRecords;
          get().generateLiabilityRecords();
          const afterRecords = get().liabilityRecords;

          const result = dataRefreshService.incrementalRefresh(
            afterRecords,
            beforeRecords,
            ['memberNo']
          );

          get().addOperationLog({
            operator: get().currentUser,
            operationType: '刷新',
            targetType: '负债记录',
            targetId: backupKey,
            beforeData: { count: beforeRecords.length },
            afterData: { count: afterRecords.length, added: result.added.length, updated: result.updated.length },
            detail: `数据刷新完成：新增${result.added.length}条，更新${result.updated.length}条，无数据丢失`,
          });

          const refreshResult: RefreshResult = {
            added: result.added.length,
            updated: result.updated.length,
            unchanged: result.unchanged.length,
            backupKey,
          };

          set({
            lastRefreshTime: formatDateTime(new Date()),
            lastBackupKey: backupKey,
          });

          return refreshResult;
        } finally {
          set({ loading: false });
        }
      },

      restoreFromBackup: (backupKey) => {
        const backup = restoreBackup<{
          liabilityRecords: LiabilityRecord[];
          badRecords: BadRecord[];
        }>(backupKey);

        if (backup) {
          set({
            liabilityRecords: backup.liabilityRecords,
            badRecords: backup.badRecords,
          });

          get().addOperationLog({
            operator: get().currentUser,
            operationType: '修改',
            targetType: '数据恢复',
            targetId: backupKey,
            beforeData: null,
            afterData: backup,
            detail: `从备份恢复数据: ${backupKey}`,
          });

          return true;
        }
        return false;
      },

      markReviewed: (recordId, comment) => {
        const now = formatDateTime(new Date());
        const operator = get().currentUser;
        const beforeRecord = get().getLiabilityById(recordId);

        set((state) => ({
          liabilityRecords: state.liabilityRecords.map(r =>
            r.id === recordId
              ? {
                  ...r,
                  reviewStatus: '已复核',
                  reviewer: operator,
                  reviewTime: now,
                  reviewComment: comment,
                  updateTime: now,
                }
              : r
          ),
        }));

        get().addOperationLog({
          operator,
          operationType: '复核',
          targetType: '负债记录',
          targetId: recordId,
          beforeData: beforeRecord || null,
          afterData: get().getLiabilityById(recordId) || null,
          detail: `复核完成，意见: ${comment}`,
        });
      },

      markBatchReviewed: (recordIds, comment) => {
        const now = formatDateTime(new Date());
        const operator = get().currentUser;

        set((state) => ({
          liabilityRecords: state.liabilityRecords.map(r =>
            recordIds.includes(r.id)
              ? {
                  ...r,
                  reviewStatus: '已复核',
                  reviewer: operator,
                  reviewTime: now,
                  reviewComment: comment,
                  updateTime: now,
                }
              : r
          ),
          selectedRecords: [],
        }));

        recordIds.forEach(id => {
          get().addOperationLog({
            operator,
            operationType: '复核',
            targetType: '负债记录',
            targetId: id,
            beforeData: null,
            afterData: get().getLiabilityById(id) || null,
            detail: `批量复核完成，意见: ${comment}`,
          });
        });
      },

      processExpired: (recordId, action, comment) => {
        const now = formatDateTime(new Date());
        const operator = get().currentUser;
        const beforeRecord = get().getLiabilityById(recordId);

        set((state) => ({
          liabilityRecords: state.liabilityRecords.map(r =>
            r.id === recordId
              ? {
                  ...r,
                  reviewStatus: action === '冲回' ? '已冲回' : '已复核',
                  reviewer: operator,
                  reviewTime: now,
                  reviewComment: `${action}: ${comment}`,
                  updateTime: now,
                }
              : r
          ),
          expireCalendars: state.expireCalendars.map(e =>
            e.memberNo === beforeRecord?.memberNo && e.isExpired
              ? {
                  ...e,
                  processStatus: action === '冲回' ? '已冲回' : '已豁免',
                  processor: operator,
                  processTime: now,
                }
              : e
          ),
        }));

        get().addOperationLog({
          operator,
          operationType: '冲回',
          targetType: '过期里程',
          targetId: recordId,
          beforeData: beforeRecord || null,
          afterData: get().getLiabilityById(recordId) || null,
          detail: `${action}过期里程，意见: ${comment}`,
        });
      },

      markBadRecordProcessed: (badRecordId, processor) => {
        const now = formatDateTime(new Date());
        set((state) => ({
          badRecords: state.badRecords.map(b =>
            b.id === badRecordId
              ? {
                  ...b,
                  isProcessed: true,
                  processor,
                  processTime: now,
                }
              : b
          ),
        }));
      },

      markBatchBadRecordsProcessed: (badRecordIds, processor) => {
        const now = formatDateTime(new Date());
        set((state) => ({
          badRecords: state.badRecords.map(b =>
            badRecordIds.includes(b.id)
              ? {
                  ...b,
                  isProcessed: true,
                  processor,
                  processTime: now,
                }
              : b
          ),
          selectedRecords: [],
        }));

        badRecordIds.forEach(id => {
          get().addOperationLog({
            operator: processor,
            operationType: '复核',
            targetType: '坏行记录',
            targetId: id,
            beforeData: null,
            afterData: { isProcessed: true },
            detail: '批量标记坏行已处理',
          });
        });
      },

      deleteBadRecords: (badRecordIds) => {
        const operator = get().currentUser;
        set((state) => ({
          badRecords: state.badRecords.filter(b => !badRecordIds.includes(b.id)),
          selectedRecords: [],
        }));

        badRecordIds.forEach(id => {
          get().addOperationLog({
            operator,
            operationType: '修改',
            targetType: '坏行记录',
            targetId: id,
            beforeData: null,
            afterData: null,
            detail: '删除坏行记录',
          });
        });
      },

      getTraceChain: (recordId) => {
        const record = get().getLiabilityById(recordId);
        if (!record) return [];
        return businessRuleEngine.generateTraceChain(record);
      },

      exportData: async (config) => {
        const records = get().getFilteredRecords(config.filters?.includeExpired);
        const badRecords = config.includeBadRecords ? get().badRecords : undefined;
        
        const fileName = await exportService.exportData(records, config, badRecords);

        get().addOperationLog({
          operator: get().currentUser,
          operationType: '导出',
          targetType: '负债数据',
          targetId: fileName,
          beforeData: null,
          afterData: { recordCount: records.length, fields: config.fields },
          detail: `导出数据文件: ${fileName}`,
        });

        return fileName;
      },

      addOperationLog: (operation) => {
        const log: OperationLog = {
          id: generateId('LOG'),
          createTime: formatDateTime(new Date()),
          ...operation,
        };
        set((state) => ({
          operationLogs: [log, ...state.operationLogs].slice(0, 1000),
        }));
      },

      generateLiabilityRecords: () => {
        const { memberAccounts, transactions, exchangeOrders, expireCalendars, activities } = get();
        
        const newRecords: LiabilityRecord[] = memberAccounts.map(account => {
          const accountTransactions = transactions.filter(t => t.memberNo === account.memberNo);
          const accountOrders = exchangeOrders.filter(o => o.memberNo === account.memberNo);
          const accountExpireRecords = expireCalendars.filter(e => e.memberNo === account.memberNo);
          
          const latestTransaction = accountTransactions.length > 0
            ? accountTransactions.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())[0]
            : null;
          
          const { category, isExpired } = businessRuleEngine.classifyBusinessCategory(
            account,
            latestTransaction,
            accountExpireRecords,
            activities
          );
          
          const estimateDetail = businessRuleEngine.calculateEstimatedLiability(account.remainingMiles, account.accountType);
          
          return {
            id: generateId('LIA'),
            memberNo: account.memberNo,
            memberName: account.memberName,
            accountType: account.accountType,
            remainingMiles: account.remainingMiles,
            liabilityCoefficient: estimateDetail.parameters.liabilityCoefficient,
            probabilityCoefficient: estimateDetail.parameters.probabilityCoefficient,
            estimatedLiability: Number(estimateDetail.calculationProcess.split('=')[1].trim()),
            businessCategory: category,
            reviewStatus: isExpired ? '未复核' : '未复核',
            isExpired,
            expireDate: account.expireDate,
            latestTransaction,
            exchangeOrders: accountOrders,
            expireRecords: accountExpireRecords,
            estimateDetail,
            createTime: formatDateTime(new Date()),
            updateTime: formatDateTime(new Date()),
          };
        });

        set({ liabilityRecords: newRecords });
      },
    }),
    {
      name: 'airline-liability-storage',
      partialize: (state) => ({
        memberAccounts: state.memberAccounts,
        transactions: state.transactions,
        exchangeOrders: state.exchangeOrders,
        expireCalendars: state.expireCalendars,
        liabilityRecords: state.liabilityRecords,
        badRecords: state.badRecords,
        operationLogs: state.operationLogs,
        activities: state.activities,
        lastRefreshTime: state.lastRefreshTime,
      }),
    }
  )
);
