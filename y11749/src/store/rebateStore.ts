import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as XLSX from 'xlsx';

import {
  MemberContract,
  SalesAssignment,
  TransferRecord,
  RefundRecord,
  PTPackage,
  RebateCalculation,
  AuditLog,
  Filters,
  RebateStatus,
} from '../types';
import { calculateAllRebates } from '../utils/calculationEngine';
import {
  memberContracts as initialContracts,
  salesAssignments as initialAssignments,
  transferRecords as initialTransfers,
  refundRecords as initialRefunds,
  ptPackages as initialPTPackages,
  stores,
  salesPersons,
} from '../data/sampleData';

function generateId(prefix: string): string {
  return prefix + '-' + Math.random().toString(36).substr(2, 9);
}

interface RebateState {
  contracts: MemberContract[];
  salesAssignments: SalesAssignment[];
  transferRecords: TransferRecord[];
  refundRecords: RefundRecord[];
  ptPackages: PTPackage[];
  rebateResults: RebateCalculation[];
  auditLogs: AuditLog[];
  filters: Filters;
  isInitialized: boolean;

  initializeData: () => void;
  setFilters: (filters: Filters) => void;
  recalculateRebate: (contractId?: string) => void;
  rollbackRefund: (refundId: string) => void;
  confirmRebate: (rebateId: string) => void;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'operatedAt'>) => void;
  exportReport: (format: 'xlsx' | 'csv') => void;
  getFilteredResults: () => RebateCalculation[];
  getStatistics: () => {
    totalRebate: number;
    normalCount: number;
    warningCount: number;
    disputedCount: number;
    confirmedCount: number;
  };
}

export const useRebateStore = create<RebateState>()(
  persist(
    (set, get) => ({
      contracts: [],
      salesAssignments: [],
      transferRecords: [],
      refundRecords: [],
      ptPackages: [],
      rebateResults: [],
      auditLogs: [],
      filters: {},
      isInitialized: false,

      initializeData: () => {
        if (get().isInitialized) return;

        const rebateResults = calculateAllRebates(
          initialContracts,
          initialAssignments,
          initialTransfers,
          initialRefunds,
          initialPTPackages
        );

        set({
          contracts: initialContracts,
          salesAssignments: initialAssignments,
          transferRecords: initialTransfers,
          refundRecords: initialRefunds,
          ptPackages: initialPTPackages,
          rebateResults,
          isInitialized: true,
        });
      },

      setFilters: (filters) => set({ filters }),

      recalculateRebate: (contractId) => {
        const state = get();
        const contracts = contractId
          ? state.contracts.filter((c) => c.id === contractId)
          : state.contracts;

        const newResults = calculateAllRebates(
          contracts,
          state.salesAssignments,
          state.transferRecords,
          state.refundRecords,
          state.ptPackages
        );

        const otherResults = state.rebateResults.filter(
          (r) => !contracts.some((c) => c.id === r.contractId)
        );

        set({
          rebateResults: [...otherResults, ...newResults],
        });

        newResults.forEach((result) => {
          get().addAuditLog({
            entityType: 'rebate',
            entityId: result.id,
            action: 'recalculate',
            beforeValue: state.rebateResults.find((r) => r.id === result.id),
            afterValue: result,
            operatedBy: '销售主管',
          });
        });
      },

      rollbackRefund: (refundId) => {
        const state = get();
        const refund = state.refundRecords.find((r) => r.id === refundId);
        if (!refund || refund.isRolledBack) return;

        const updatedRefunds = state.refundRecords.map((r) =>
          r.id === refundId ? { ...r, isRolledBack: true } : r
        );

        set({ refundRecords: updatedRefunds });

        get().addAuditLog({
          entityType: 'refund',
          entityId: refundId,
          action: 'rollback',
          beforeValue: refund,
          afterValue: { ...refund, isRolledBack: true },
          operatedBy: '销售主管',
          remark: '退课回滚',
        });

        get().recalculateRebate(refund.contractId);
      },

      confirmRebate: (rebateId) => {
        const state = get();
        const rebate = state.rebateResults.find((r) => r.id === rebateId);
        if (!rebate) return;

        const updatedResults = state.rebateResults.map((r) =>
          r.id === rebateId
            ? {
                ...r,
                status: 'confirmed' as RebateStatus,
                confirmedBy: '销售主管',
                confirmedAt: new Date().toISOString(),
              }
            : r
        );

        set({ rebateResults: updatedResults });

        get().addAuditLog({
          entityType: 'rebate',
          entityId: rebateId,
          action: 'confirm',
          beforeValue: rebate,
          afterValue: { ...rebate, status: 'confirmed' },
          operatedBy: '销售主管',
        });
      },

      addAuditLog: (log) => {
        const newLog: AuditLog = {
          ...log,
          id: generateId('audit'),
          operatedAt: new Date().toISOString(),
        };
        set((state) => ({
          auditLogs: [newLog, ...state.auditLogs].slice(0, 500),
        }));
      },

      exportReport: (format) => {
        const state = get();
        const results = state.getFilteredResults();

        const exportData = results.map((r) => {
          const contract = state.contracts.find((c) => c.id === r.contractId);
          const warnings = r.warnings.map((w) => w.message).join('; ');
          const dataSources = [];
          
          if (contract) dataSources.push('会员合同');
          if (state.salesAssignments.some((a) => a.contractId === r.contractId))
            dataSources.push('销售归属');
          if (state.transferRecords.some((t) => t.contractId === r.contractId))
            dataSources.push('转店记录');
          if (state.refundRecords.some((rf) => rf.contractId === r.contractId))
            dataSources.push('退课流水');
          if (state.ptPackages.some((p) => p.contractId === r.contractId))
            dataSources.push('私教包');

          return {
            '合同编号': r.contractId,
            '会员姓名': contract?.memberName || '',
            '门店': r.storeName,
            '销售姓名': r.salesName,
            '合同金额': r.baseAmount,
            '返利比例': `${(r.rebateRate * 100).toFixed(0)}%`,
            '基础返利': r.rebateAmount.toFixed(2),
            '调整金额': r.adjustmentAmount.toFixed(2),
            '最终返利': r.finalAmount.toFixed(2),
            '状态': r.status === 'normal' ? '正常' : r.status === 'warning' ? '警告' : r.status === 'disputed' ? '争议' : '已确认',
            '异常提示': warnings,
            '计算版本': r.calculationVersion,
            '数据来源': dataSources.join(', '),
            '最后计算时间': r.lastCalculatedAt,
          };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '返利明细');

        if (format === 'xlsx') {
          XLSX.writeFile(wb, `返利报告_${new Date().toISOString().split('T')[0]}.xlsx`);
        } else {
          XLSX.writeFile(wb, `返利报告_${new Date().toISOString().split('T')[0]}.csv`, { bookType: 'csv' });
        }
      },

      getFilteredResults: () => {
        const state = get();
        let results = [...state.rebateResults];

        if (state.filters.storeId) {
          results = results.filter((r) => r.storeId === state.filters.storeId);
        }

        if (state.filters.salesId) {
          results = results.filter((r) => r.salesId === state.filters.salesId);
        }

        if (state.filters.status) {
          results = results.filter((r) => r.status === state.filters.status);
        }

        if (state.filters.startDate || state.filters.endDate) {
          results = results.filter((r) => {
            const contract = state.contracts.find((c) => c.id === r.contractId);
            if (!contract) return false;
            if (state.filters.startDate && contract.contractDate < state.filters.startDate) return false;
            if (state.filters.endDate && contract.contractDate > state.filters.endDate) return false;
            return true;
          });
        }

        return results;
      },

      getStatistics: () => {
        const results = get().rebateResults;
        return {
          totalRebate: results.reduce((sum, r) => sum + r.finalAmount, 0),
          normalCount: results.filter((r) => r.status === 'normal').length,
          warningCount: results.filter((r) => r.status === 'warning').length,
          disputedCount: results.filter((r) => r.status === 'disputed').length,
          confirmedCount: results.filter((r) => r.status === 'confirmed').length,
        };
      },
    }),
    {
      name: 'rebate-store',
      version: 1,
    }
  )
);

export { stores, salesPersons };
