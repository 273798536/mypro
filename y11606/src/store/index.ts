import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppState,
  ComparisonScheme,
  HistoryRecord,
  LoanBaseInfo,
  PenaltyRule,
  PrepaymentResult,
  RateAdjustment,
  RepaymentItem,
} from '@/types';
import { generateId } from '@/utils/calculator';

interface AppActions {
  setLoanInfo: (info: LoanBaseInfo | null) => void;
  updateLoanInfo: (updates: Partial<LoanBaseInfo>) => void;
  setRepaymentSchedule: (schedule: RepaymentItem[]) => void;
  updateRepaymentItem: (period: number, updates: Partial<RepaymentItem>, note?: string) => void;
  addRateAdjustment: (adjustment: Omit<RateAdjustment, 'id' | 'createdAt'>) => void;
  setRateAdjustments: (adjustments: RateAdjustment[]) => void;
  updateRateAdjustment: (id: string, updates: Partial<RateAdjustment>) => void;
  removeRateAdjustment: (id: string) => void;
  setPenaltyRule: (rule: PenaltyRule | null) => void;
  addPrepaymentResult: (result: PrepaymentResult) => void;
  removePrepaymentResult: (id: string) => void;
  setActiveResultId: (id: string | null) => void;
  addHistoryRecord: (record: Omit<HistoryRecord, 'id'>) => void;
  addComparisonScheme: (scheme: Omit<ComparisonScheme, 'id'>) => void;
  removeComparisonScheme: (id: string) => void;
  clearComparisonSchemes: () => void;
  resetAll: () => void;
}

const initialState: AppState = {
  loanInfo: null,
  repaymentSchedule: [],
  rateAdjustments: [],
  penaltyRule: null,
  prepaymentResults: [],
  historyRecords: [],
  comparisonSchemes: [],
  activeResultId: null,
};

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setLoanInfo: (info) => {
        const oldInfo = get().loanInfo;
        set({ loanInfo: info ? { ...info, updatedAt: new Date().toISOString() } : null });
        if (info) {
          get().addHistoryRecord({
            loanId: info.id,
            timestamp: new Date().toISOString(),
            action: oldInfo ? 'update' : 'create',
            fieldName: '贷款基础信息',
            oldValue: oldInfo,
            newValue: info,
            source: info.source || '用户录入',
          });
        }
      },

      updateLoanInfo: (updates) => {
        const { loanInfo } = get();
        if (!loanInfo) return;
        const newInfo = { ...loanInfo, ...updates, updatedAt: new Date().toISOString() };
        set({ loanInfo: newInfo });
        
        Object.entries(updates).forEach(([key, value]) => {
          get().addHistoryRecord({
            loanId: loanInfo.id,
            timestamp: new Date().toISOString(),
            action: 'update',
            fieldName: key,
            oldValue: loanInfo[key as keyof LoanBaseInfo],
            newValue: value,
            source: '用户修改',
          });
        });
      },

      setRepaymentSchedule: (schedule) => {
        set({ repaymentSchedule: schedule });
      },

      updateRepaymentItem: (period, updates, note) => {
        const { repaymentSchedule, loanInfo } = get();
        const idx = repaymentSchedule.findIndex((item) => item.period === period);
        if (idx === -1) return;
        
        const oldItem = repaymentSchedule[idx];
        const newSchedule = [...repaymentSchedule];
        newSchedule[idx] = {
          ...oldItem,
          ...updates,
          isCorrected: true,
          correctionNote: note,
          correctedAt: new Date().toISOString(),
        };
        set({ repaymentSchedule: newSchedule });
        
        if (loanInfo) {
          get().addHistoryRecord({
            loanId: loanInfo.id,
            timestamp: new Date().toISOString(),
            action: 'correct',
            fieldName: `还款计划-第${period}期`,
            oldValue: oldItem,
            newValue: newSchedule[idx],
            operatorNote: note,
            source: '人工修正',
          });
        }
      },

      addRateAdjustment: (adjustment) => {
        const { loanInfo } = get();
        const newAdjustment: RateAdjustment = {
          ...adjustment,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ rateAdjustments: [...state.rateAdjustments, newAdjustment] }));
        
        if (loanInfo) {
          get().addHistoryRecord({
            loanId: loanInfo.id,
            timestamp: new Date().toISOString(),
            action: 'create',
            fieldName: '利率调整记录',
            newValue: newAdjustment,
            source: adjustment.source,
          });
        }
      },

      setRateAdjustments: (adjustments) => {
        set({ rateAdjustments: adjustments });
      },

      updateRateAdjustment: (id, updates) => {
        const { rateAdjustments, loanInfo } = get();
        const idx = rateAdjustments.findIndex((a) => a.id === id);
        if (idx === -1) return;
        
        const oldAdj = rateAdjustments[idx];
        const newAdjustments = [...rateAdjustments];
        newAdjustments[idx] = { ...oldAdj, ...updates };
        set({ rateAdjustments: newAdjustments });
        
        if (loanInfo) {
          get().addHistoryRecord({
            loanId: loanInfo.id,
            timestamp: new Date().toISOString(),
            action: 'update',
            fieldName: `利率调整-${oldAdj.effectiveDate}`,
            oldValue: oldAdj,
            newValue: newAdjustments[idx],
            source: '用户修改',
          });
        }
      },

      removeRateAdjustment: (id) => {
        const { rateAdjustments, loanInfo } = get();
        const adj = rateAdjustments.find((a) => a.id === id);
        set((state) => ({ rateAdjustments: state.rateAdjustments.filter((a) => a.id !== id) }));
        
        if (adj && loanInfo) {
          get().addHistoryRecord({
            loanId: loanInfo.id,
            timestamp: new Date().toISOString(),
            action: 'update',
            fieldName: '利率调整记录',
            oldValue: adj,
            newValue: null,
            operatorNote: '删除利率调整记录',
            source: '用户操作',
          });
        }
      },

      setPenaltyRule: (rule) => {
        const { penaltyRule: oldRule, loanInfo } = get();
        set({ penaltyRule: rule });
        
        if (loanInfo) {
          get().addHistoryRecord({
            loanId: loanInfo.id,
            timestamp: new Date().toISOString(),
            action: oldRule ? 'update' : 'create',
            fieldName: '违约金规则',
            oldValue: oldRule,
            newValue: rule,
            source: rule?.source || '用户录入',
          });
        }
      },

      addPrepaymentResult: (result) => {
        set((state) => ({
          prepaymentResults: [result, ...state.prepaymentResults],
          activeResultId: result.id,
        }));
        
        if (get().loanInfo) {
          get().addHistoryRecord({
            loanId: get().loanInfo!.id,
            timestamp: new Date().toISOString(),
            action: 'calculate',
            fieldName: '提前还款试算',
            newValue: {
              id: result.id,
              prepaymentDate: result.params.prepaymentDate,
              prepaymentAmount: result.params.prepaymentAmount,
              interestSaved: result.interestSaved,
              penaltyAmount: result.penaltyAmount,
            },
            source: '系统计算',
          });
        }
      },

      removePrepaymentResult: (id) => {
        set((state) => ({
          prepaymentResults: state.prepaymentResults.filter((r) => r.id !== id),
          activeResultId: state.activeResultId === id ? null : state.activeResultId,
          comparisonSchemes: state.comparisonSchemes.filter((s) => s.resultId !== id),
        }));
      },

      setActiveResultId: (id) => {
        set({ activeResultId: id });
      },

      addHistoryRecord: (record) => {
        const newRecord: HistoryRecord = {
          ...record,
          id: generateId(),
        };
        set((state) => ({
          historyRecords: [newRecord, ...state.historyRecords].slice(0, 500),
        }));
      },

      addComparisonScheme: (scheme) => {
        set((state) => ({
          comparisonSchemes: [...state.comparisonSchemes, { ...scheme, id: generateId() }],
        }));
      },

      removeComparisonScheme: (id) => {
        set((state) => ({
          comparisonSchemes: state.comparisonSchemes.filter((s) => s.id !== id),
        }));
      },

      clearComparisonSchemes: () => {
        set({ comparisonSchemes: [] });
      },

      resetAll: () => {
        set(initialState);
      },
    }),
    {
      name: 'prepayment-calculator-store',
      partialize: (state) => ({
        loanInfo: state.loanInfo,
        repaymentSchedule: state.repaymentSchedule,
        rateAdjustments: state.rateAdjustments,
        penaltyRule: state.penaltyRule,
        prepaymentResults: state.prepaymentResults,
        historyRecords: state.historyRecords,
      }),
    }
  )
);
