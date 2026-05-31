import type { Series, Cost, Flow, Payment, Calculation, ChangeLog } from '@/types';
import { generateId } from '@/utils/storage';

export interface CalculationInput {
  series: Series;
  costs: Cost[];
  flows: Flow[];
  payments: Payment[];
  periodStart: string;
  periodEnd: string;
  existingCalculation?: Calculation;
}

export interface CalculationResult {
  totalCost: number;
  totalFlow: number;
  totalPayment: number;
  recoveryRate: number;
  profit: number;
}

export function calculateRecovery(input: CalculationInput): CalculationResult {
  const { series, costs, flows, payments } = input;
  
  const totalCostAmount = costs.reduce((sum, c) => sum + c.amount, 0);
  const totalCost = totalCostAmount + series.productionCost;
  const totalFlow = flows.reduce((sum, f) => sum + f.amount, 0);
  const totalPayment = payments.reduce((sum, p) => sum + p.amount, 0);
  
  const recoveryRate = totalCost > 0 ? totalPayment / totalCost : 0;
  const profit = totalPayment - totalCost;
  
  return { totalCost, totalFlow, totalPayment, recoveryRate, profit };
}

export function createCalculation(input: CalculationInput): Calculation {
  const result = calculateRecovery(input);
  const now = new Date().toISOString();
  
  return {
    id: generateId('calc'),
    seriesId: input.series.id,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    ...result,
    status: 'pending',
    version: input.existingCalculation ? input.existingCalculation.version + 1 : 1,
    calculatedAt: now,
    costIds: input.costs.map(c => c.id),
    flowIds: input.flows.map(f => f.id),
    paymentIds: input.payments.map(p => p.id),
  };
}

export function recalculateCalculation(
  existing: Calculation,
  input: CalculationInput
): Calculation {
  const result = calculateRecovery(input);
  const now = new Date().toISOString();
  
  return {
    ...existing,
    ...result,
    version: existing.version + 1,
    calculatedAt: now,
    costIds: input.costs.map(c => c.id),
    flowIds: input.flows.map(f => f.id),
    paymentIds: input.payments.map(p => p.id),
    status: 'pending',
  };
}

export function filterDataByPeriod<T extends { costDate?: string; flowDate?: string; paymentDate?: string }>(
  data: T[],
  periodStart: string,
  periodEnd: string,
  dateField: 'costDate' | 'flowDate' | 'paymentDate'
): T[] {
  return data.filter(item => {
    const date = item[dateField];
    if (!date) return false;
    return date >= periodStart && date <= periodEnd;
  });
}

export function collectRelatedData(
  seriesId: string,
  allCosts: Cost[],
  allFlows: Flow[],
  allPayments: Payment[],
  periodStart: string,
  periodEnd: string
): { costs: Cost[]; flows: Flow[]; payments: Payment[] } {
  const seriesCosts = allCosts.filter(c => c.seriesId === seriesId);
  const seriesFlows = allFlows.filter(f => f.seriesId === seriesId);
  const seriesPayments = allPayments.filter(p => p.seriesId === seriesId);
  
  return {
    costs: filterDataByPeriod(seriesCosts, periodStart, periodEnd, 'costDate'),
    flows: filterDataByPeriod(seriesFlows, periodStart, periodEnd, 'flowDate'),
    payments: filterDataByPeriod(seriesPayments, periodStart, periodEnd, 'paymentDate'),
  };
}

export function markOutdatedCalculations(
  seriesId: string,
  changeLog: ChangeLog,
  calculations: Calculation[]
): Calculation[] {
  return calculations.map(calc => {
    if (calc.seriesId === seriesId && changeLog.affectedCalculations.includes(calc.id)) {
      return { ...calc, status: 'outdated' as const };
    }
    return calc;
  });
}
