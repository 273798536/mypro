import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  BondPosition,
  CouponPlan,
  CustodyReceipt,
  VerificationResult,
  DashboardStats,
  TimelineEvent,
  VerificationStatus,
  ImportRecord,
} from '../types';
import { verificationEngine } from '../engine/verificationEngine';
import { generateAllMockData } from '../engine/mockDataGenerator';
import { getCurrentDateTime } from '../utils/dateUtils';

interface CouponState {
  positions: BondPosition[];
  couponPlans: CouponPlan[];
  receipts: CustodyReceipt[];
  verificationResults: VerificationResult[];
  importRecords: ImportRecord[];
  selectedPlanId: string | null;
  currentMonth: string;
  importOrder: number;

  initMockData: () => void;
  clearAllData: () => void;
  setSelectedPlanId: (id: string | null) => void;
  setCurrentMonth: (month: string) => void;

  addPositions: (positions: BondPosition[], fileName: string) => void;
  addCouponPlans: (plans: CouponPlan[], fileName: string) => void;
  addReceipts: (receipts: CustodyReceipt[], fileName: string) => void;

  runVerification: () => void;
  markAsReviewed: (resultId: string, note?: string) => void;
  batchMarkAsReviewed: (resultIds: string[], note?: string) => void;

  getDashboardStats: () => DashboardStats;
  getTimelineEvents: () => TimelineEvent[];
  getFilteredResults: (status?: VerificationStatus) => VerificationResult[];
  getPlanDetail: (planId: string) => {
    plan: CouponPlan | undefined;
    position: BondPosition | undefined;
    receipt: CustodyReceipt | undefined;
    result: VerificationResult | undefined;
  };
}

export const useCouponStore = create<CouponState>()(
  persist(
    (set, get) => ({
      positions: [],
      couponPlans: [],
      receipts: [],
      verificationResults: [],
      importRecords: [],
      selectedPlanId: null,
      currentMonth: '2026-05',
      importOrder: 0,

      initMockData: () => {
        const { positions, couponPlans, receipts } = generateAllMockData();
        const results = verificationEngine.runBatchVerification(couponPlans, receipts);
        const importOrder = get().importOrder;

        set({
          positions,
          couponPlans,
          receipts,
          verificationResults: results,
          importRecords: [
            {
              id: 'IMP001',
              type: 'position',
              fileName: '债券持仓表_202605.xlsx',
              importDate: getCurrentDateTime(),
              recordCount: positions.length,
              importOrder: importOrder + 1,
            },
            {
              id: 'IMP002',
              type: 'coupon',
              fileName: '票息计划表_202605.xlsx',
              importDate: getCurrentDateTime(),
              recordCount: couponPlans.length,
              importOrder: importOrder + 2,
            },
            {
              id: 'IMP003',
              type: 'receipt',
              fileName: '托管回单_202605.xlsx',
              importDate: getCurrentDateTime(),
              recordCount: receipts.length,
              importOrder: importOrder + 3,
            },
          ],
          importOrder: importOrder + 3,
        });
      },

      clearAllData: () => {
        set({
          positions: [],
          couponPlans: [],
          receipts: [],
          verificationResults: [],
          importRecords: [],
          selectedPlanId: null,
          importOrder: 0,
        });
      },

      setSelectedPlanId: (id) => set({ selectedPlanId: id }),
      setCurrentMonth: (month) => set({ currentMonth: month }),

      addPositions: (newPositions, fileName) => {
        const importOrder = get().importOrder + 1;
        const positionsWithOrder = newPositions.map(p => ({
          ...p,
          importDate: getCurrentDateTime(),
          importOrder,
        }));

        set(state => ({
          positions: [...state.positions, ...positionsWithOrder],
          importRecords: [
            ...state.importRecords,
            {
              id: `IMP${Date.now()}`,
              type: 'position',
              fileName,
              importDate: getCurrentDateTime(),
              recordCount: newPositions.length,
              importOrder,
            },
          ],
          importOrder,
        }));
      },

      addCouponPlans: (newPlans, fileName) => {
        const importOrder = get().importOrder + 1;
        const plansWithOrder = newPlans.map(p => ({
          ...p,
          importDate: getCurrentDateTime(),
        }));

        set(state => ({
          couponPlans: [...state.couponPlans, ...plansWithOrder],
          importRecords: [
            ...state.importRecords,
            {
              id: `IMP${Date.now()}`,
              type: 'coupon',
              fileName,
              importDate: getCurrentDateTime(),
              recordCount: newPlans.length,
              importOrder,
            },
          ],
          importOrder,
        }));

        get().runVerification();
      },

      addReceipts: (newReceipts, fileName) => {
        const importOrder = get().importOrder + 1;
        const receiptsWithOrder = newReceipts.map(r => ({
          ...r,
          importDate: getCurrentDateTime(),
          importOrder,
        }));

        set(state => ({
          receipts: [...state.receipts, ...receiptsWithOrder],
          importRecords: [
            ...state.importRecords,
            {
              id: `IMP${Date.now()}`,
              type: 'receipt',
              fileName,
              importDate: getCurrentDateTime(),
              recordCount: newReceipts.length,
              importOrder,
            },
          ],
          importOrder,
        }));

        get().runVerification();
      },

      runVerification: () => {
        const { couponPlans, receipts } = get();
        const results = verificationEngine.runBatchVerification(couponPlans, receipts);
        set({ verificationResults: results });
      },

      markAsReviewed: (resultId, note) => {
        set(state => ({
          verificationResults: state.verificationResults.map(r =>
            r.resultId === resultId
              ? {
                  ...r,
                  isReviewed: true,
                  reviewer: '当前用户',
                  reviewDate: getCurrentDateTime(),
                  reviewNote: note,
                }
              : r
          ),
        }));
      },

      batchMarkAsReviewed: (resultIds, note) => {
        set(state => ({
          verificationResults: state.verificationResults.map(r =>
            resultIds.includes(r.resultId)
              ? {
                  ...r,
                  isReviewed: true,
                  reviewer: '当前用户',
                  reviewDate: getCurrentDateTime(),
                  reviewNote: note,
                }
              : r
          ),
        }));
      },

      getDashboardStats: () => {
        const { verificationResults, couponPlans } = get();

        const totalPlans = couponPlans.length;
        const totalAmount = couponPlans.reduce((sum, p) => sum + p.expectedAmount, 0);

        const receivedResults = verificationResults.filter(
          r => r.status === 'full' || r.status === 'adjusted'
        );
        const receivedCount = receivedResults.length;
        const receivedAmount = receivedResults.reduce((sum, r) => sum + r.actualAmount, 0);

        const pendingResults = verificationResults.filter(r => r.status === 'pending');
        const pendingCount = pendingResults.length;
        const pendingAmount = pendingResults.reduce((sum, r) => sum + r.expectedAmount, 0);

        const exceptionResults = verificationResults.filter(
          r => r.status === 'partial' || r.status === 'none' || r.status === 'position_changed'
        );
        const exceptionCount = exceptionResults.length;
        const exceptionAmount = exceptionResults.reduce((sum, r) => sum + Math.abs(r.diffAmount), 0);

        const arrivalRate = totalPlans > 0 ? receivedCount / totalPlans : 0;

        return {
          totalPlans,
          totalAmount,
          receivedCount,
          receivedAmount,
          pendingCount,
          pendingAmount,
          exceptionCount,
          exceptionAmount,
          arrivalRate,
        };
      },

      getTimelineEvents: () => {
        const { couponPlans, verificationResults, receipts } = get();
        const resultMap = new Map(verificationResults.map(r => [r.planId, r]));
        const receiptMap = new Map(receipts.map(r => [r.planId, r]));

        return couponPlans.map(plan => {
          const result = resultMap.get(plan.planId);
          const hasReceipt = receiptMap.has(plan.planId);

          return {
            planId: plan.planId,
            bondCode: plan.bondCode,
            bondName: plan.bondName,
            paymentDate: plan.paymentDate,
            expectedAmount: plan.expectedAmount,
            status: result?.status || 'pending',
            statusLabel: result?.statusLabel || '待核验',
            hasReceipt,
          };
        });
      },

      getFilteredResults: (status) => {
        const { verificationResults } = get();
        if (!status) return verificationResults;
        return verificationResults.filter(r => r.status === status);
      },

      getPlanDetail: (planId) => {
        const { couponPlans, positions, receipts, verificationResults } = get();

        const plan = couponPlans.find(p => p.planId === planId);
        const position = positions.find(p => p.bondCode === plan?.bondCode);
        const receipt = receipts.find(r => r.planId === planId);
        const result = verificationResults.find(r => r.planId === planId);

        return { plan, position, receipt, result };
      },
    }),
    {
      name: 'coupon-verification-store',
    }
  )
);
