import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RedemptionRequest, StatusLog, TraceRecord, AppState, AppActions } from '@/types';
import { sampleRedemptions, sampleTraceRecords, sampleSettlementSteps, sampleStatusLogs, sampleFunds, sampleQuotaConfigs } from '@/data/sampleData';

const getInitialState = (): AppState => ({
  redemptions: sampleRedemptions,
  traceRecords: sampleTraceRecords,
  settlementSteps: sampleSettlementSteps,
  statusLogs: sampleStatusLogs,
  funds: sampleFunds,
  quotaConfigs: sampleQuotaConfigs,
});

const generateId = (prefix: string) => `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;

export const useRedemptionStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      ...getInitialState(),

      updateRedemption: (id: string, updates: Partial<RedemptionRequest>, operator: string, reason: string) => {
        const redemption = get().redemptions.find(r => r.id === id);
        if (!redemption) return;

        const newStatusLog: StatusLog = {
          id: generateId('L'),
          requestId: id,
          fromStatus: redemption.status,
          toStatus: updates.status || redemption.status,
          timestamp: new Date().toISOString(),
          operator,
          reason,
        };

        set((state) => ({
          redemptions: state.redemptions.map(r =>
            r.id === id ? { ...r, ...updates } : r
          ),
          statusLogs: [newStatusLog, ...state.statusLogs],
        }));
      },

      confirmPartialRedemption: (id: string, confirmedAmount: number, operator: string, reason: string) => {
        const redemption = get().redemptions.find(r => r.id === id);
        if (!redemption) return;

        const newStatusLog: StatusLog = {
          id: generateId('L'),
          requestId: id,
          fromStatus: redemption.status,
          toStatus: 'confirmed',
          timestamp: new Date().toISOString(),
          operator,
          reason,
        };

        const newTrace: TraceRecord = {
          id: generateId('T'),
          requestId: id,
          conclusion: `运营修正确认份额 ${confirmedAmount.toLocaleString()} 份`,
          source: `运营人工修正，操作人：${operator}，原因：${reason}`,
          sourceType: 'quota_threshold',
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          redemptions: state.redemptions.map(r =>
            r.id === id ? { ...r, confirmedAmount, status: 'confirmed', needsReview: false } : r
          ),
          statusLogs: [newStatusLog, ...state.statusLogs],
          traceRecords: [newTrace, ...state.traceRecords],
        }));
      },

      approveReview: (id: string, operator: string, reason: string) => {
        const redemption = get().redemptions.find(r => r.id === id);
        if (!redemption) return;

        const toStatus = redemption.isDelayed ? 'delayed' : 'confirmed';

        const newStatusLog: StatusLog = {
          id: generateId('L'),
          requestId: id,
          fromStatus: redemption.status,
          toStatus,
          timestamp: new Date().toISOString(),
          operator,
          reason,
        };

        set((state) => ({
          redemptions: state.redemptions.map(r =>
            r.id === id ? { ...r, status: toStatus, needsReview: false } : r
          ),
          statusLogs: [newStatusLog, ...state.statusLogs],
        }));
      },

      rejectReview: (id: string, operator: string, reason: string) => {
        const redemption = get().redemptions.find(r => r.id === id);
        if (!redemption) return;

        const newStatusLog: StatusLog = {
          id: generateId('L'),
          requestId: id,
          fromStatus: redemption.status,
          toStatus: 'pending',
          timestamp: new Date().toISOString(),
          operator,
          reason,
        };

        set((state) => ({
          redemptions: state.redemptions.map(r =>
            r.id === id ? { ...r, status: 'pending', needsReview: false, confirmedAmount: 0 } : r
          ),
          statusLogs: [newStatusLog, ...state.statusLogs],
        }));
      },

      resetToSampleData: () => {
        set(getInitialState());
      },

      exportToCSV: () => {
        const { redemptions, traceRecords } = get();

        const headers = ['赎回编号', '客户名称', '基金名称', '申请份额', '确认份额', '状态', '排队位置', '申请日期', '预计到账日', '是否顺延', '顺延原因', '申请来源'];
        const rows = redemptions.map(r => [
          r.id,
          r.customerName,
          r.fundName,
          r.requestAmount,
          r.confirmedAmount || 0,
          getStatusText(r.status),
          r.queuePosition,
          r.applyDate,
          r.expectedSettlementDate,
          r.isDelayed ? '是' : '否',
          r.delayReason || '',
          r.source,
        ]);

        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.join(',')),
          '',
          '=== 溯源记录 ===',
          ['赎回编号', '结论', '来源', '来源类型', '时间'].join(','),
          ...traceRecords.map(t => [
            t.requestId,
            `"${t.conclusion}"`,
            `"${t.source}"`,
            getSourceTypeText(t.sourceType),
            t.timestamp,
          ].join(',')),
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `赎回排队数据_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        return csvContent;
      },
    }),
    {
      name: 'redemption-queue-storage',
    }
  )
);

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待处理',
    confirmed: '已确认',
    partial_confirmed: '部分确认',
    delayed: '清算顺延',
    settled: '已到账',
    reviewing: '待复核',
  };
  return map[status] || status;
}

function getSourceTypeText(type: string): string {
  const map: Record<string, string> = {
    redemption_application: '赎回申请',
    share_confirmation: '份额确认',
    quota_threshold: '额度阈值',
    settlement_rule: '清算规则',
  };
  return map[type] || type;
}
