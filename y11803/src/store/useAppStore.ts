import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState, RefundOrder, RefundStatus, HistoryAction, CustomerNote, BatchStatus } from '@/types';
import { initialAppState } from '@/data/mockData';
import { generateId } from '@/utils/formatters';
import { recalculateFrozenAmount, recalculateAllPools } from '@/utils/anomalyDetection';

interface AppActions {
  updateRefundStatus: (id: string, status: RefundStatus, reason: string) => void;
  correctRefund: (id: string, updates: Partial<RefundOrder>, reason: string) => void;
  addCustomerNote: (refundOrderId: string, content: string) => void;
  updateBatchStatus: (batchId: string, status: BatchStatus, reason: string) => void;
  addHistoryRecord: (
    refundOrderId: string,
    action: HistoryAction,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    reason: string
  ) => void;
  resetToInitialState: () => void;
}

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      ...initialAppState,

      updateRefundStatus: (id: string, status: RefundStatus, reason: string) => {
        const state = get();
        const refund = state.refundOrders.find(r => r.id === id);
        if (!refund) return;

        const oldValues = { status: refund.status };
        refund.status = status;
        if (status === 'approved' || status === 'rejected' || status === 'processed') {
          refund.reviewTime = new Date().toISOString();
          refund.reviewer = state.currentUser.originalName;
        }
        const newValues = { status, reviewTime: refund.reviewTime, reviewer: refund.reviewer };

        state.addHistoryRecord(id, 'status_update', oldValues, newValues, reason);

        if (refund.batchId) {
          recalculateFrozenAmount(refund.batchId, state.batches, state.refundOrders, state.reservePools);
        }

        set({ ...state });
      },

      correctRefund: (id: string, updates: Partial<RefundOrder>, reason: string) => {
        const state = get();
        const refund = state.refundOrders.find(r => r.id === id);
        if (!refund) return;

        const oldValues: Record<string, any> = {};
        const newValues: Record<string, any> = {};

        for (const key of Object.keys(updates)) {
          const k = key as keyof RefundOrder;
          oldValues[key] = refund[k];
          newValues[key] = updates[k];
          (refund as any)[key] = updates[k];
        }

        state.addHistoryRecord(id, 'amount_correction', oldValues, newValues, reason);

        if (refund.batchId) {
          recalculateFrozenAmount(refund.batchId, state.batches, state.refundOrders, state.reservePools);
        }

        set({ ...state });
      },

      addCustomerNote: (refundOrderId: string, content: string) => {
        const state = get();
        const note: CustomerNote = {
          id: generateId('NOTE-'),
          refundOrderId,
          operatorOriginalName: state.currentUser.originalName,
          content,
          createTime: new Date().toISOString(),
          isSystemGenerated: false,
          originalSource: '运营工作台',
        };

        state.customerNotes.unshift(note);
        state.addHistoryRecord(
          refundOrderId,
          'note_add',
          {},
          { note: content },
          '添加客服备注'
        );

        set({ ...state });
      },

      updateBatchStatus: (batchId: string, status: BatchStatus, reason: string) => {
        const state = get();
        const batch = state.batches.find(b => b.id === batchId);
        if (!batch) return;

        const oldValues = { status: batch.status };
        batch.status = status;
        const newValues = { status };

        recalculateFrozenAmount(batchId, state.batches, state.refundOrders, state.reservePools);

        const affectedRefunds = state.refundOrders.filter(r => r.batchId === batchId);
        for (const refund of affectedRefunds) {
          state.addHistoryRecord(
            refund.id,
            'status_update',
            oldValues,
            newValues,
            `批次状态变更: ${reason}`
          );
        }

        set({ ...state });
      },

      addHistoryRecord: (
        refundOrderId: string,
        action: HistoryAction,
        oldValues: Record<string, any>,
        newValues: Record<string, any>,
        reason: string
      ) => {
        const state = get();
        state.historyRecords.unshift({
          id: generateId('HIST-'),
          refundOrderId,
          operatorOriginalName: state.currentUser.originalName,
          action,
          oldValues,
          newValues,
          reason,
          timestamp: new Date().toISOString(),
          ip: '127.0.0.1',
        });
      },

      resetToInitialState: () => {
        set({ ...initialAppState });
        setTimeout(() => {
          const state = get();
          recalculateAllPools(state.batches, state.refundOrders, state.reservePools);
          set({ ...state });
        }, 0);
      },
    }),
    {
      name: 'merchant-refund-reserve-storage',
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state) {
          recalculateAllPools(state.batches, state.refundOrders, state.reservePools);
        }
      },
    }
  )
);
