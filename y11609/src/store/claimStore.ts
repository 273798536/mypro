import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Claim, DeductRule, OperationType, Receipt, Supplement } from '@/types';
import { mockClaims, mockDeductRules } from '@/data/mockData';
import { detectAnomalies, calculatePayout, matchDeductRule } from '@/utils/rulesEngine';

interface ClaimState {
  claims: Claim[];
  deductRules: DeductRule[];
  currentOperator: string;
  initialized: boolean;

  initMockData: () => void;
  getClaimById: (id: string) => Claim | undefined;
  updateClaim: (id: string, updates: Partial<Claim>) => void;
  recalculateClaim: (id: string) => { success: boolean; message: string };
  addReceipt: (claimId: string, receipt: Omit<Receipt, 'id'>) => { success: boolean; message: string };
  removeReceipt: (claimId: string, receiptId: string) => void;
  addSupplement: (claimId: string, supplement: Omit<Supplement, 'id' | 'createdAt'>) => void;
  updateSupplement: (claimId: string, supplementId: string, updates: Partial<Supplement>) => void;
  updateClaimStatus: (id: string, status: Claim['status'], reason: string) => void;
  getAllReceiptNos: () => Set<string>;
  getOtherReceiptNos: (excludeClaimId: string) => Set<string>;
  resetData: () => void;
}

export const useClaimStore = create<ClaimState>()(
  persist(
    (set, get) => ({
      claims: [],
      deductRules: [],
      currentOperator: '当前用户',
      initialized: false,

      initMockData: () => {
        if (get().initialized) return;
        set({
          claims: mockClaims,
          deductRules: mockDeductRules,
          initialized: true,
        });
      },

      getClaimById: (id) => {
        return get().claims.find((c) => c.id === id);
      },

      getAllReceiptNos: () => {
        const receiptNos = new Set<string>();
        get().claims.forEach((claim) => {
          claim.receipts.forEach((r) => receiptNos.add(r.receiptNo));
        });
        return receiptNos;
      },

      getOtherReceiptNos: (excludeClaimId) => {
        const receiptNos = new Set<string>();
        get().claims.forEach((claim) => {
          if (claim.id !== excludeClaimId) {
            claim.receipts.forEach((r) => receiptNos.add(r.receiptNo));
          }
        });
        return receiptNos;
      },

      updateClaim: (id, updates) => {
        const { claims, currentOperator } = get();
        const claimIndex = claims.findIndex((c) => c.id === id);
        if (claimIndex === -1) return;

        const oldClaim = claims[claimIndex];
        const newVersion = `v${oldClaim.history.length + 1}.0`;

        const historyEntry = {
          id: `h-${Date.now()}`,
          version: newVersion,
          operator: currentOperator,
          operateAt: new Date().toISOString(),
          operation: 'update' as OperationType,
          reason: '更新理赔单信息',
          beforeData: oldClaim,
          afterData: { ...updates },
        };

        const updatedClaims = [...claims];
        updatedClaims[claimIndex] = {
          ...oldClaim,
          ...updates,
          updatedAt: new Date().toISOString(),
          history: [...oldClaim.history, historyEntry],
        };

        const allReceiptNos = new Set<string>();
        updatedClaims.forEach((c) => {
          if (c.id !== id) {
            c.receipts.forEach((r) => allReceiptNos.add(r.receiptNo));
          }
        });

        updatedClaims[claimIndex].anomalies = detectAnomalies(
          updatedClaims[claimIndex],
          allReceiptNos
        );

        set({ claims: updatedClaims });
      },

      recalculateClaim: (id) => {
        const { claims, deductRules, currentOperator } = get();
        const claimIndex = claims.findIndex((c) => c.id === id);
        if (claimIndex === -1) return { success: false, message: '理赔单不存在' };

        const oldClaim = claims[claimIndex];
        const rule = matchDeductRule(oldClaim.policy.productName, deductRules);
        if (!rule) return { success: false, message: '未找到适用的免赔规则' };

        const totalAmount = oldClaim.receipts.reduce((sum, r) => sum + r.amount, 0);
        const result = calculatePayout(totalAmount, rule);

        const newVersion = `v${oldClaim.history.length + 1}.0`;
        const historyEntry = {
          id: `h-${Date.now()}`,
          version: newVersion,
          operator: currentOperator,
          operateAt: new Date().toISOString(),
          operation: 'calculate' as OperationType,
          reason: '规则引擎重新计算',
          beforeData: {
            totalAmount: oldClaim.totalAmount,
            deductible: oldClaim.deductible,
            payoutAmount: oldClaim.payoutAmount,
          },
          afterData: result,
        };

        const updatedClaims = [...claims];
        updatedClaims[claimIndex] = {
          ...oldClaim,
          totalAmount: result.totalAmount,
          deductible: result.deductible,
          coinsuranceRate: result.coinsuranceRate,
          payoutAmount: result.payoutAmount,
          deductRule: rule,
          needsRecalculate: false,
          updatedAt: new Date().toISOString(),
          history: [...oldClaim.history, historyEntry],
        };

        const allReceiptNos = new Set<string>();
        updatedClaims.forEach((c) => {
          if (c.id !== id) {
            c.receipts.forEach((r) => allReceiptNos.add(r.receiptNo));
          }
        });

        updatedClaims[claimIndex].anomalies = detectAnomalies(
          updatedClaims[claimIndex],
          allReceiptNos
        );

        set({ claims: updatedClaims });
        return { success: true, message: '计算完成' };
      },

      addReceipt: (claimId, receipt) => {
        const { claims, currentOperator } = get();
        const claimIndex = claims.findIndex((c) => c.id === claimId);
        if (claimIndex === -1) return { success: false, message: '理赔单不存在' };

        const otherReceiptNos = get().getOtherReceiptNos(claimId);
        const isDuplicateInOther = otherReceiptNos.has(receipt.receiptNo);

        const oldClaim = claims[claimIndex];
        const isDuplicateInSelf = oldClaim.receipts.some(
          (r) => r.receiptNo === receipt.receiptNo
        );
        if (isDuplicateInOther || isDuplicateInSelf) {
          return { success: false, message: '该票据号已存在，可能重复报销' };
        }

        const newReceipt: Receipt = {
          ...receipt,
          id: `r-${Date.now()}`,
          isDuplicate: isDuplicateInOther,
        };

        const newVersion = `v${oldClaim.history.length + 1}.0`;
        const historyEntry = {
          id: `h-${Date.now()}`,
          version: newVersion,
          operator: currentOperator,
          operateAt: new Date().toISOString(),
          operation: 'update' as OperationType,
          reason: '添加票据',
          beforeData: { receipts: oldClaim.receipts },
          afterData: { receipt: newReceipt },
        };

        const updatedClaims = [...claims];
        updatedClaims[claimIndex] = {
          ...oldClaim,
          receipts: [...oldClaim.receipts, newReceipt],
          needsRecalculate: true,
          updatedAt: new Date().toISOString(),
          history: [...oldClaim.history, historyEntry],
        };

        updatedClaims[claimIndex].anomalies = detectAnomalies(
          updatedClaims[claimIndex],
          otherReceiptNos
        );

        set({ claims: updatedClaims });
        return { success: true, message: '票据添加成功' };
      },

      removeReceipt: (claimId, receiptId) => {
        const { claims, currentOperator } = get();
        const claimIndex = claims.findIndex((c) => c.id === claimId);
        if (claimIndex === -1) return;

        const oldClaim = claims[claimIndex];
        const removedReceipt = oldClaim.receipts.find((r) => r.id === receiptId);

        const newVersion = `v${oldClaim.history.length + 1}.0`;
        const historyEntry = {
          id: `h-${Date.now()}`,
          version: newVersion,
          operator: currentOperator,
          operateAt: new Date().toISOString(),
          operation: 'update' as OperationType,
          reason: '删除票据',
          beforeData: { removedReceipt },
          afterData: {},
        };

        const updatedClaims = [...claims];
        updatedClaims[claimIndex] = {
          ...oldClaim,
          receipts: oldClaim.receipts.filter((r) => r.id !== receiptId),
          needsRecalculate: true,
          updatedAt: new Date().toISOString(),
          history: [...oldClaim.history, historyEntry],
        };

        const allReceiptNos = new Set<string>();
        updatedClaims.forEach((c) => {
          if (c.id !== claimId) {
            c.receipts.forEach((r) => allReceiptNos.add(r.receiptNo));
          }
        });
        updatedClaims[claimIndex].anomalies = detectAnomalies(
          updatedClaims[claimIndex],
          allReceiptNos
        );

        set({ claims: updatedClaims });
      },

      addSupplement: (claimId, supplement) => {
        const { claims, currentOperator } = get();
        const claimIndex = claims.findIndex((c) => c.id === claimId);
        if (claimIndex === -1) return;

        const oldClaim = claims[claimIndex];
        const newSupplement: Supplement = {
          ...supplement,
          id: `s-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };

        const newVersion = `v${oldClaim.history.length + 1}.0`;
        const historyEntry = {
          id: `h-${Date.now()}`,
          version: newVersion,
          operator: currentOperator,
          operateAt: new Date().toISOString(),
          operation: 'update' as OperationType,
          reason: '添加补充材料要求',
          beforeData: {},
          afterData: { supplement: newSupplement },
        };

        const updatedClaims = [...claims];
        updatedClaims[claimIndex] = {
          ...oldClaim,
          supplements: [...oldClaim.supplements, newSupplement],
          status: supplement.status === 'pending' ? 'supplement' : oldClaim.status,
          updatedAt: new Date().toISOString(),
          history: [...oldClaim.history, historyEntry],
        };

        const otherReceiptNos = get().getOtherReceiptNos(claimId);
        updatedClaims[claimIndex].anomalies = detectAnomalies(
          updatedClaims[claimIndex],
          otherReceiptNos
        );

        set({ claims: updatedClaims });
      },

      updateSupplement: (claimId, supplementId, updates) => {
        const { claims, currentOperator } = get();
        const claimIndex = claims.findIndex((c) => c.id === claimId);
        if (claimIndex === -1) return;

        const oldClaim = claims[claimIndex];
        const oldSupplement = oldClaim.supplements.find((s) => s.id === supplementId);

        const newVersion = `v${oldClaim.history.length + 1}.0`;
        const historyEntry = {
          id: `h-${Date.now()}`,
          version: newVersion,
          operator: currentOperator,
          operateAt: new Date().toISOString(),
          operation: 'update' as OperationType,
          reason: '更新补充材料状态',
          beforeData: { supplement: oldSupplement },
          afterData: updates,
        };

        const updatedClaims = [...claims];
        updatedClaims[claimIndex] = {
          ...oldClaim,
          supplements: oldClaim.supplements.map((s) =>
            s.id === supplementId ? { ...s, ...updates } : s
          ),
          needsRecalculate: true,
          updatedAt: new Date().toISOString(),
          history: [...oldClaim.history, historyEntry],
        };

        const allSupplementProvided = updatedClaims[claimIndex].supplements.every(
          (s) => s.status !== 'pending'
        );
        if (allSupplementProvided && updatedClaims[claimIndex].status === 'supplement') {
          updatedClaims[claimIndex].status = 'reviewing';
        }

        const otherReceiptNos = get().getOtherReceiptNos(claimId);
        updatedClaims[claimIndex].anomalies = detectAnomalies(
          updatedClaims[claimIndex],
          otherReceiptNos
        );

        set({ claims: updatedClaims });
      },

      updateClaimStatus: (id, status, reason) => {
        const { claims, currentOperator } = get();
        const claimIndex = claims.findIndex((c) => c.id === id);
        if (claimIndex === -1) return;

        const oldClaim = claims[claimIndex];
        const newVersion = `v${oldClaim.history.length + 1}.0`;
        const historyEntry = {
          id: `h-${Date.now()}`,
          version: newVersion,
          operator: currentOperator,
          operateAt: new Date().toISOString(),
          operation: (status === 'approved' ? 'approve' : 'reject') as OperationType,
          reason,
          beforeData: { status: oldClaim.status },
          afterData: { status },
        };

        const updatedClaims = [...claims];
        updatedClaims[claimIndex] = {
          ...oldClaim,
          status,
          conclusion: reason,
          updatedAt: new Date().toISOString(),
          history: [...oldClaim.history, historyEntry],
        };

        set({ claims: updatedClaims });
      },

      resetData: () => {
        set({
          claims: mockClaims,
          deductRules: mockDeductRules,
          initialized: true,
        });
      },
    }),
    {
      name: 'claim-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
