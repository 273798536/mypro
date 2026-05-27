import { create } from 'zustand';
import type { 
  PredictionRecord, 
  AnomalyRecord, 
  CorrectionRecord, 
  GroupStats, 
  DashboardMetrics,
  GroupByDimension 
} from '../types';
import { 
  calculateDashboardMetrics, 
  groupByDimension, 
  filterRecords 
} from '../utils/calculations';
import { detectAllAnomalies } from '../utils/anomalyDetection';
import { generateMockPredictionData, generateMockCorrections } from '../utils/mockData';

interface DataState {
  records: PredictionRecord[];
  anomalies: AnomalyRecord[];
  corrections: CorrectionRecord[];
  groupStats: GroupStats[];
  metrics: DashboardMetrics;
  filters: {
    categories: string[];
    startDate: string;
    endDate: string;
    promotionOnly: boolean;
    anomaliesOnly: boolean;
  };
  groupBy: GroupByDimension;
  selectedRecordId: string | null;
  highlightedDate: string | null;
  targetCoverage: number;
  
  setRecords: (records: PredictionRecord[]) => void;
  setFilters: (filters: Partial<DataState['filters']>) => void;
  setGroupBy: (dimension: GroupByDimension) => void;
  selectRecord: (id: string | null) => void;
  highlightDate: (date: string | null) => void;
  addCorrection: (correction: Omit<CorrectionRecord, 'id' | 'timestamp'>) => void;
  resolveAnomaly: (anomalyId: string, resolution: string) => void;
  loadMockData: () => void;
  recomputeStats: () => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  records: [],
  anomalies: [],
  corrections: [],
  groupStats: [],
  metrics: {
    overallCoverage: 0,
    totalRecords: 0,
    totalAnomalies: 0,
    categoryCount: 0,
    promotionCount: 0,
    targetCoverage: 0.9
  },
  filters: {
    categories: [],
    startDate: '',
    endDate: '',
    promotionOnly: false,
    anomaliesOnly: false
  },
  groupBy: 'category',
  selectedRecordId: null,
  highlightedDate: null,
  targetCoverage: 0.9,

  setRecords: (records) => {
    set({ records });
    get().recomputeStats();
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters }
    }));
    get().recomputeStats();
  },

  setGroupBy: (dimension) => {
    set({ groupBy: dimension });
    get().recomputeStats();
  },

  selectRecord: (id) => set({ selectedRecordId: id }),

  highlightDate: (date) => set({ highlightedDate: date }),

  addCorrection: (correction) => {
    const newCorrection: CorrectionRecord = {
      ...correction,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString()
    };
    set((state) => ({
      corrections: [newCorrection, ...state.corrections]
    }));
  },

  resolveAnomaly: (anomalyId, resolution) => {
    set((state) => ({
      anomalies: state.anomalies.map(a =>
        a.id === anomalyId
          ? { ...a, resolved: true, resolution }
          : a
      )
    }));
  },

  loadMockData: () => {
    const records = generateMockPredictionData(90);
    const corrections = generateMockCorrections();
    set({ records, corrections });
    get().recomputeStats();
  },

  recomputeStats: () => {
    const { records, filters, groupBy, targetCoverage } = get();
    const filteredRecords = filterRecords(records, filters);
    const groupStats = groupByDimension(filteredRecords, groupBy);
    const metrics = calculateDashboardMetrics(filteredRecords, targetCoverage);
    const anomalies = detectAllAnomalies(filteredRecords, groupStats);

    set({
      groupStats,
      metrics,
      anomalies
    });
  }
}));
