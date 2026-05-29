import { create } from 'zustand';
import {
  Dealer,
  SalesOrder,
  Payment,
  RebateAgreement,
  RebateTrial,
  TrialVersion,
  CorrectionSuggestion,
  TodoItem,
  CalculationDetail,
  DeductionItem,
  ModificationRecord,
  DiffReport,
  VersionDifference,
  DashboardStats
} from '../types';
import {
  mockDealers,
  mockSalesOrders,
  mockPayments,
  mockAgreements,
  mockTrials,
  mockSuggestions,
  mockTodos
} from '../data/mockData';

interface RebateState {
  dealers: Dealer[];
  salesOrders: SalesOrder[];
  payments: Payment[];
  agreements: RebateAgreement[];
  trials: RebateTrial[];
  suggestions: CorrectionSuggestion[];
  todos: TodoItem[];
  
  selectedTrial: RebateTrial | null;
  compareVersion1: number | null;
  compareVersion2: number | null;
  
  setSelectedTrial: (trial: RebateTrial | null) => void;
  setCompareVersions: (v1: number | null, v2: number | null) => void;
  
  updateSalesOrder: (orderId: string, updates: Partial<SalesOrder>, reason: string, operator: string) => void;
  updatePayment: (paymentId: string, updates: Partial<Payment>) => void;
  
  calculateRebate: (dealerId: string, agreementId: string, period: string, operator: string) => RebateTrial;
  recalculateTrial: (trialId: string, operator: string) => void;
  applyCorrectionToTrial: (trialId: string, versionNo: number, correction: {
    fieldName: string;
    oldValue: string;
    newValue: string;
    reason: string;
    operator: string;
  }) => void;
  
  compareTrialVersions: (trialId: string, v1: number, v2: number) => DiffReport;
  
  applySuggestion: (suggestionId: string, operator: string) => void;
  dismissSuggestion: (suggestionId: string) => void;
  
  toggleTodo: (todoId: string) => void;
  
  getDashboardStats: () => DashboardStats;
  exportTrialToExcel: (trialId: string) => void;
  exportDiffReport: (trialId: string, v1: number, v2: number) => void;
}

export const useRebateStore = create<RebateState>((set, get) => ({
  dealers: mockDealers,
  salesOrders: mockSalesOrders,
  payments: mockPayments,
  agreements: mockAgreements,
  trials: mockTrials,
  suggestions: mockSuggestions,
  todos: mockTodos,
  
  selectedTrial: null,
  compareVersion1: null,
  compareVersion2: null,
  
  setSelectedTrial: (trial) => set({ selectedTrial: trial }),
  setCompareVersions: (v1, v2) => set({ compareVersion1: v1, compareVersion2: v2 }),
  
  updateSalesOrder: (orderId, updates, reason, operator) => {
    set((state) => {
      const newOrders = state.salesOrders.map((order) => {
        if (order.id === orderId) {
          const modificationHistory: ModificationRecord[] = [];
          
          Object.entries(updates).forEach(([key, value]) => {
            const oldValue = String(order[key as keyof SalesOrder] ?? '');
            const newValue = String(value ?? '');
            if (oldValue !== newValue) {
              modificationHistory.push({
                id: `mh-${Date.now()}-${key}`,
                fieldName: key,
                oldValue,
                newValue,
                reason,
                operator,
                operateTime: new Date().toISOString()
              });
            }
          });
          
          const updatedOrder = {
            ...order,
            ...updates,
            missingFields: order.missingFields.filter((f) => !(f in updates) || updates[f as keyof SalesOrder] !== ''),
            modificationHistory: [...order.modificationHistory, ...modificationHistory]
          };
          
          return updatedOrder;
        }
        return order;
      });
      
      return { salesOrders: newOrders };
    });
  },
  
  updatePayment: (paymentId, updates) => {
    set((state) => ({
      payments: state.payments.map((p) =>
        p.id === paymentId ? { ...p, ...updates } : p
      )
    }));
  },
  
  calculateRebate: (dealerId, agreementId, period, operator) => {
    const state = get();
    const dealer = state.dealers.find((d) => d.id === dealerId);
    const agreement = state.agreements.find((a) => a.id === agreementId);
    
    if (!dealer || !agreement) {
      throw new Error('经销商或协议不存在');
    }
    
    const currentVersion = agreement.versions[agreement.versions.length - 1];
    const dealerSales = state.salesOrders.filter(
      (o) => o.dealerId === dealerId && o.status !== 'returned'
    );
    const baseAmount = dealerSales.reduce((sum, o) => sum + o.amount, 0);
    
    let rebateRate = currentVersion.terms.rebateRate;
    if (currentVersion.terms.tieredRates?.length) {
      for (const tier of currentVersion.terms.tieredRates) {
        if (baseAmount >= tier.minAmount && baseAmount < tier.maxAmount) {
          rebateRate = tier.rate;
          break;
        }
      }
    }
    
    const calculationDetails: CalculationDetail[] = dealerSales.slice(0, 20).map((order) => ({
      id: `cd-${order.id}`,
      orderNo: order.orderNo,
      orderAmount: order.amount,
      rebateRate,
      rebateAmount: Math.round(order.amount * rebateRate * 100) / 100,
      remark: ''
    }));
    
    const calculatedRebate = Math.round(baseAmount * rebateRate * 100) / 100;
    const deductions: DeductionItem[] = [];
    const totalDeduction = 0;
    
    const newTrialVersion: TrialVersion = {
      id: `tv-${Date.now()}`,
      trialId: '',
      versionNo: 1,
      agreementVersionId: currentVersion.id,
      baseAmount,
      calculatedRebate,
      totalDeduction,
      finalRebateAmount: calculatedRebate - totalDeduction,
      calculationDetails,
      deductions,
      status: 'calculated',
      createTime: new Date().toISOString(),
      operator,
      correctionLogs: [],
      reviewHistory: []
    };
    
    const newTrial: RebateTrial = {
      id: `t-${Date.now()}`,
      dealerId,
      dealerName: dealer.name,
      agreementId,
      period,
      status: 'calculated',
      currentVersion: 1,
      createTime: new Date().toISOString(),
      versions: [{ ...newTrialVersion, trialId: `t-${Date.now()}` }]
    };
    
    set((state) => ({
      trials: [...state.trials, newTrial]
    }));
    
    return newTrial;
  },
  
  recalculateTrial: (trialId, operator) => {
    set((state) => {
      const trials = state.trials.map((trial) => {
        if (trial.id !== trialId) return trial;
        
        const agreement = state.agreements.find((a) => a.id === trial.agreementId);
        if (!agreement) return trial;
        
        const currentVersion = agreement.versions[agreement.versions.length - 1];
        const dealerSales = state.salesOrders.filter(
          (o) => o.dealerId === trial.dealerId && o.status !== 'returned'
        );
        const baseAmount = dealerSales.reduce((sum, o) => sum + o.amount, 0);
        
        let rebateRate = currentVersion.terms.rebateRate;
        if (currentVersion.terms.tieredRates?.length) {
          for (const tier of currentVersion.terms.tieredRates) {
            if (baseAmount >= tier.minAmount && baseAmount < tier.maxAmount) {
              rebateRate = tier.rate;
              break;
            }
          }
        }
        
        const calculationDetails: CalculationDetail[] = dealerSales.slice(0, 20).map((order) => ({
          id: `cd-${order.id}-${Date.now()}`,
          orderNo: order.orderNo,
          orderAmount: order.amount,
          rebateRate,
          rebateAmount: Math.round(order.amount * rebateRate * 100) / 100,
          remark: ''
        }));
        
        const calculatedRebate = Math.round(baseAmount * rebateRate * 100) / 100;
        const totalDeduction = trial.versions[trial.versions.length - 1]?.totalDeduction || 0;
        const deductions = trial.versions[trial.versions.length - 1]?.deductions || [];
        
        const newVersionNo = trial.currentVersion + 1;
        const newVersion: TrialVersion = {
          id: `tv-${Date.now()}`,
          trialId: trial.id,
          versionNo: newVersionNo,
          agreementVersionId: currentVersion.id,
          baseAmount,
          calculatedRebate,
          totalDeduction,
          finalRebateAmount: calculatedRebate - totalDeduction,
          calculationDetails,
          deductions,
          status: 'calculated',
          createTime: new Date().toISOString(),
          operator,
          correctionLogs: [
            {
              id: `cl-${Date.now()}`,
              trialVersionId: `tv-${Date.now()}`,
              fieldName: 'recalculation',
              oldValue: `V${trial.currentVersion}`,
              newValue: `V${newVersionNo}`,
              reason: '数据变更后重新计算',
              operator,
              operateTime: new Date().toISOString()
            }
          ],
          reviewHistory: []
        };
        
        return {
          ...trial,
          currentVersion: newVersionNo,
          versions: [...trial.versions, newVersion]
        };
      });
      
      return { trials };
    });
  },
  
  applyCorrectionToTrial: (trialId, versionNo, correction) => {
    set((state) => ({
      trials: state.trials.map((trial) => {
        if (trial.id !== trialId) return trial;
        
        return {
          ...trial,
          versions: trial.versions.map((v) => {
            if (v.versionNo !== versionNo) return v;
            
            const newLog = {
              id: `cl-${Date.now()}`,
              trialVersionId: v.id,
              ...correction,
              operateTime: new Date().toISOString()
            };
            
            return {
              ...v,
              status: 'adjusted',
              correctionLogs: [...v.correctionLogs, newLog]
            };
          })
        };
      })
    }));
  },
  
  compareTrialVersions: (trialId, v1, v2) => {
    const state = get();
    const trial = state.trials.find((t) => t.id === trialId);
    
    if (!trial) {
      throw new Error('试算不存在');
    }
    
    const version1 = trial.versions.find((v) => v.versionNo === v1);
    const version2 = trial.versions.find((v) => v.versionNo === v2);
    
    if (!version1 || !version2) {
      throw new Error('版本不存在');
    }
    
    const differences: VersionDifference[] = [];
    const fieldsToCompare = ['baseAmount', 'calculatedRebate', 'totalDeduction', 'finalRebateAmount'];
    
    fieldsToCompare.forEach((field) => {
      const oldVal = version1[field as keyof TrialVersion] as number;
      const newVal = version2[field as keyof TrialVersion] as number;
      
      if (oldVal !== newVal) {
        differences.push({
          fieldName: field,
          oldValue: oldVal,
          newValue: newVal,
          changeType: newVal > oldVal ? 'increase' : 'decrease',
          changeAmount: newVal - oldVal
        });
      }
    });
    
    const calculationDiffs: { orderNo: string; fieldDiffs: VersionDifference[] }[] = [];
    const allOrderNos = new Set([
      ...version1.calculationDetails.map((d) => d.orderNo),
      ...version2.calculationDetails.map((d) => d.orderNo)
    ]);
    
    allOrderNos.forEach((orderNo) => {
      const d1 = version1.calculationDetails.find((d) => d.orderNo === orderNo);
      const d2 = version2.calculationDetails.find((d) => d.orderNo === orderNo);
      
      const fieldDiffs: VersionDifference[] = [];
      
      if (d1 && d2) {
        if (d1.rebateRate !== d2.rebateRate) {
          fieldDiffs.push({
            fieldName: 'rebateRate',
            oldValue: d1.rebateRate,
            newValue: d2.rebateRate,
            changeType: d2.rebateRate > d1.rebateRate ? 'increase' : 'decrease'
          });
        }
        if (d1.rebateAmount !== d2.rebateAmount) {
          fieldDiffs.push({
            fieldName: 'rebateAmount',
            oldValue: d1.rebateAmount,
            newValue: d2.rebateAmount,
            changeType: d2.rebateAmount > d1.rebateAmount ? 'increase' : 'decrease',
            changeAmount: d2.rebateAmount - d1.rebateAmount
          });
        }
      }
      
      if (fieldDiffs.length > 0) {
        calculationDiffs.push({ orderNo, fieldDiffs });
      }
    });
    
    const amountDifference = version2.finalRebateAmount - version1.finalRebateAmount;
    
    return {
      trialId,
      version1: v1,
      version2: v2,
      differences,
      calculationDiffs,
      deductionDiffs: [],
      summary: {
        totalChanges: differences.length + calculationDiffs.length,
        amountDifference,
        affectedOrders: calculationDiffs.map((d) => d.orderNo)
      }
    };
  },
  
  applySuggestion: (suggestionId, operator) => {
    set((state) => {
      const suggestion = state.suggestions.find((s) => s.id === suggestionId);
      if (!suggestion) return state;
      
      if (suggestion.type === 'sales_return') {
        suggestion.affectedOrders.forEach((orderNo) => {
          const order = state.salesOrders.find((o) => o.orderNo === orderNo);
          if (order) {
            get().updateSalesOrder(order.id, { status: 'returned' }, '根据修正建议标记退货', operator);
          }
        });
      }
      
      return {
        suggestions: state.suggestions.map((s) =>
          s.id === suggestionId ? { ...s, status: 'applied' } : s
        )
      };
    });
  },
  
  dismissSuggestion: (suggestionId) => {
    set((state) => ({
      suggestions: state.suggestions.map((s) =>
        s.id === suggestionId ? { ...s, status: 'dismissed' } : s
      )
    }));
  },
  
  toggleTodo: (todoId) => {
    set((state) => ({
      todos: state.todos.map((t) =>
        t.id === todoId ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t
      )
    }));
  },
  
  getDashboardStats: () => {
    const state = get();
    const totalSalesAmount = state.salesOrders.reduce((sum, o) => sum + o.amount, 0);
    const pendingTrials = state.trials.filter((t) => t.status !== 'finalized').length;
    const pendingSuggestions = state.suggestions.filter((s) => s.status === 'pending').length;
    const ordersWithMissingFields = state.salesOrders.filter((o) => o.missingFields.length > 0).length;
    const dataQualityScore = Math.round(((state.salesOrders.length - ordersWithMissingFields) / state.salesOrders.length) * 100);
    
    return {
      totalDealers: state.dealers.length,
      totalSalesAmount,
      pendingTrials,
      correctionSuggestions: pendingSuggestions,
      dataQualityScore
    };
  },
  
  exportTrialToExcel: () => {
    console.log('导出Excel');
  },
  
  exportDiffReport: () => {
    console.log('导出差异报告');
  }
}));
