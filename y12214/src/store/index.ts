import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Series, Cost, Flow, Payment, Calculation, ChangeLog, Exception } from '@/types';
import { mockSeries, mockCosts, mockFlows, mockPayments, mockCalculations, mockChangeLogs, mockExceptions } from '@/data/mockData';
import { collectRelatedData, createCalculation, markOutdatedCalculations, calculateRecovery } from '@/engine/calculation';
import { detectExceptions, determineCalculationStatus, mergeExceptions } from '@/engine/exception';
import { createChangeLog, getCurrentOperator } from '@/engine/changeTracker';
import { isInitialized, markInitialized } from '@/utils/storage';

interface AppState {
  series: Series[];
  costs: Cost[];
  flows: Flow[];
  payments: Payment[];
  calculations: Calculation[];
  changeLogs: ChangeLog[];
  exceptions: Exception[];
  isLoading: boolean;
  error: string | null;
}

interface AppActions {
  initializeData: () => void;
  addSeries: (series: Omit<Series, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSeries: (id: string, updates: Partial<Series>, reason: string) => void;
  deleteSeries: (id: string) => void;
  addCost: (cost: Omit<Cost, 'id' | 'createdAt'>) => void;
  updateCost: (id: string, updates: Partial<Cost>) => void;
  deleteCost: (id: string) => void;
  addFlow: (flow: Omit<Flow, 'id' | 'createdAt'>) => void;
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt'>) => void;
  triggerCalculation: (seriesId: string, periodStart: string, periodEnd: string, existingCalculationId?: string) => void;
  updateExceptionStatus: (id: string, status: Exception['status'], remark?: string) => void;
  getSeriesById: (id: string) => Series | undefined;
  getCalculationById: (id: string) => Calculation | undefined;
  getSeriesCalculations: (seriesId: string) => Calculation[];
  getSeriesCosts: (seriesId: string) => Cost[];
  getSeriesFlows: (seriesId: string) => Flow[];
  getSeriesPayments: (seriesId: string) => Payment[];
  getSeriesChangeLogs: (seriesId: string) => ChangeLog[];
  getCalculationExceptions: (calculationId: string) => Exception[];
  getSeriesMap: () => Map<string, Series>;
  getCalculationMap: () => Map<string, Calculation>;
}

const getInitialData = (): AppState => {
  if (isInitialized()) {
    return {
      series: [],
      costs: [],
      flows: [],
      payments: [],
      calculations: [],
      changeLogs: [],
      exceptions: [],
      isLoading: false,
      error: null,
    };
  }
  return {
    series: mockSeries,
    costs: mockCosts,
    flows: mockFlows,
    payments: mockPayments,
    calculations: mockCalculations,
    changeLogs: mockChangeLogs,
    exceptions: mockExceptions,
    isLoading: false,
    error: null,
  };
};

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      ...getInitialData(),
      
      initializeData: () => {
        if (!isInitialized()) {
          markInitialized();
        }
      },
      
      addSeries: (seriesData) => {
        const now = new Date().toISOString();
        const newSeries: Series = {
          ...seriesData,
          id: `s_${Date.now()}`,
          createdAt: now,
          updatedAt: now,
        };
        set(state => ({ series: [...state.series, newSeries] }));
      },
      
      updateSeries: (id, updates, reason) => {
        const state = get();
        const oldSeries = state.series.find(s => s.id === id);
        if (!oldSeries) return;
        
        const newSeries = { ...oldSeries, ...updates, updatedAt: new Date().toISOString() };
        const operator = getCurrentOperator();
        
        const logs: ChangeLog[] = [];
        Object.entries(updates).forEach(([field, value]) => {
          if (value !== undefined && String(oldSeries[field as keyof Series]) !== String(value)) {
            const log = createChangeLog(
              {
                seriesId: id,
                operator,
                fieldName: field,
                oldValue: String(oldSeries[field as keyof Series] ?? ''),
                newValue: String(value),
                changeReason: reason,
              },
              state.calculations
            );
            logs.push(log);
          }
        });
        
        let updatedCalculations = state.calculations;
        logs.forEach(log => {
          updatedCalculations = markOutdatedCalculations(id, log, updatedCalculations);
        });
        
        set({
          series: state.series.map(s => s.id === id ? newSeries : s),
          changeLogs: [...state.changeLogs, ...logs],
          calculations: updatedCalculations,
        });
      },
      
      deleteSeries: (id) => {
        set(state => ({
          series: state.series.filter(s => s.id !== id),
          costs: state.costs.filter(c => c.seriesId !== id),
          flows: state.flows.filter(f => f.seriesId !== id),
          payments: state.payments.filter(p => p.seriesId !== id),
          calculations: state.calculations.filter(c => c.seriesId !== id),
          changeLogs: state.changeLogs.filter(l => l.seriesId !== id),
          exceptions: state.exceptions.filter(e => {
            const calc = state.calculations.find(c => c.id === e.calculationId);
            return calc?.seriesId !== id;
          }),
        }));
      },
      
      addCost: (costData) => {
        const newCost: Cost = {
          ...costData,
          id: `c_${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        set(state => ({ costs: [...state.costs, newCost] }));
        
        const state = get();
        const relatedCalcs = state.calculations.filter(c => c.seriesId === costData.seriesId);
        if (relatedCalcs.length > 0) {
          set(state => ({
            calculations: state.calculations.map(c => 
              c.seriesId === costData.seriesId ? { ...c, status: 'outdated' } : c
            ),
          }));
        }
      },
      
      updateCost: (id, updates) => {
        set(state => ({
          costs: state.costs.map(c => c.id === id ? { ...c, ...updates } : c),
        }));
        
        const state = get();
        const cost = state.costs.find(c => c.id === id);
        if (cost) {
          set(state => ({
            calculations: state.calculations.map(c => 
              c.seriesId === cost.seriesId ? { ...c, status: 'outdated' } : c
            ),
          }));
        }
      },
      
      deleteCost: (id) => {
        const state = get();
        const cost = state.costs.find(c => c.id === id);
        set(state => ({ costs: state.costs.filter(c => c.id !== id) }));
        
        if (cost) {
          set(state => ({
            calculations: state.calculations.map(c => 
              c.seriesId === cost.seriesId ? { ...c, status: 'outdated' } : c
            ),
          }));
        }
      },
      
      addFlow: (flowData) => {
        const newFlow: Flow = {
          ...flowData,
          id: `f_${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        set(state => ({ flows: [...state.flows, newFlow] }));
      },
      
      addPayment: (paymentData) => {
        const newPayment: Payment = {
          ...paymentData,
          id: `p_${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        set(state => ({ payments: [...state.payments, newPayment] }));
      },
      
      triggerCalculation: (seriesId, periodStart, periodEnd, existingCalculationId) => {
        const state = get();
        const series = state.series.find(s => s.id === seriesId);
        if (!series) return;
        
        const { costs, flows, payments } = collectRelatedData(
          seriesId,
          state.costs,
          state.flows,
          state.payments,
          periodStart,
          periodEnd
        );
        
        const existingCalc = existingCalculationId 
          ? state.calculations.find(c => c.id === existingCalculationId)
          : undefined;
        
        let newCalculation: Calculation;
        if (existingCalc) {
          const result = calculateRecovery({
            series, costs, flows, payments, periodStart, periodEnd,
          });
          newCalculation = {
            ...existingCalc,
            ...result,
            periodStart,
            periodEnd,
            calculatedAt: new Date().toISOString(),
            version: existingCalc.version + 1,
            costIds: costs.map(c => c.id),
            flowIds: flows.map(f => f.id),
            paymentIds: payments.map(p => p.id),
          };
        } else {
          newCalculation = createCalculation({
            series, costs, flows, payments, periodStart, periodEnd,
          });
        }
        
        const newExceptions = detectExceptions(newCalculation, costs, payments);
        const calcStatus = determineCalculationStatus(newExceptions);
        newCalculation.status = calcStatus;
        
        const mergedExceptions = mergeExceptions(
          state.exceptions,
          newExceptions,
          newCalculation.id
        );
        
        if (existingCalculationId) {
          set(state => ({
            calculations: state.calculations.map(c => c.id === existingCalculationId ? newCalculation : c),
            exceptions: mergedExceptions,
          }));
        } else {
          set(state => ({
            calculations: [...state.calculations, newCalculation],
            exceptions: mergedExceptions,
          }));
        }
      },
      
      updateExceptionStatus: (id, status, remark) => {
        set(state => ({
          exceptions: state.exceptions.map(e => {
            if (e.id === id) {
              return {
                ...e,
                status,
                remark: remark || e.remark,
                resolvedAt: status === 'resolved' ? new Date().toISOString() : e.resolvedAt,
              };
            }
            return e;
          }),
        }));
      },
      
      getSeriesById: (id) => get().series.find(s => s.id === id),
      getCalculationById: (id) => get().calculations.find(c => c.id === id),
      getSeriesCalculations: (seriesId) => get().calculations.filter(c => c.seriesId === seriesId),
      getSeriesCosts: (seriesId) => get().costs.filter(c => c.seriesId === seriesId),
      getSeriesFlows: (seriesId) => get().flows.filter(f => f.seriesId === seriesId),
      getSeriesPayments: (seriesId) => get().payments.filter(p => p.seriesId === seriesId),
      getSeriesChangeLogs: (seriesId) => get().changeLogs.filter(l => l.seriesId === seriesId),
      getCalculationExceptions: (calculationId) => get().exceptions.filter(e => e.calculationId === calculationId),
      getSeriesMap: () => new Map(get().series.map(s => [s.id, s])),
      getCalculationMap: () => new Map(get().calculations.map(c => [c.id, c])),
    }),
    {
      name: 'dramacalc-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        series: state.series,
        costs: state.costs,
        flows: state.flows,
        payments: state.payments,
        calculations: state.calculations,
        changeLogs: state.changeLogs,
        exceptions: state.exceptions,
      }),
      onRehydrateStorage: () => {
        return () => {
          if (!isInitialized()) {
            markInitialized();
          }
        };
      },
    }
  )
);
