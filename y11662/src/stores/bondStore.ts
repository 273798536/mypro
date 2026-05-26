import { create } from 'zustand';
import { BondHolding, CashFlow, AnomalyRecord, CorrectionRecord, BondDataState } from '../types';
import { sampleBondHoldings, generateSampleCashFlows, generateSampleAnomalies } from '../utils/sampleData';

export const useBondStore = create<BondDataState & {
  setHoldings: (holdings: BondHolding[]) => void;
  setCashFlows: (cashFlows: CashFlow[]) => void;
  setAnomalies: (anomalies: AnomalyRecord[]) => void;
  addCorrection: (record: CorrectionRecord) => void;
  loadSampleData: () => void;
  clearData: () => void;
  setDataSource: (source: string) => void;
}>((set) => ({
  holdings: [],
  cashFlows: [],
  anomalies: [],
  correctionHistory: [],
  dataSource: '',
  isLoaded: false,

  setHoldings: (holdings) => set({ holdings, isLoaded: true }),
  setCashFlows: (cashFlows) => set({ cashFlows }),
  setAnomalies: (anomalies) => set({ anomalies }),
  addCorrection: (record) =>
    set((state) => ({
      correctionHistory: [...state.correctionHistory, record],
    })),
  loadSampleData: () => {
    const cashFlows = generateSampleCashFlows();
    const anomalies = generateSampleAnomalies(cashFlows);
    set({
      holdings: sampleBondHoldings,
      cashFlows,
      anomalies,
      dataSource: '示例数据',
      isLoaded: true,
    });
  },
  clearData: () =>
    set({
      holdings: [],
      cashFlows: [],
      anomalies: [],
      correctionHistory: [],
      dataSource: '',
      isLoaded: false,
    }),
  setDataSource: (source) => set({ dataSource: source }),
}));