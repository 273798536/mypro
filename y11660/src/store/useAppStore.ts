import { create } from 'zustand';
import type { AppStore, ProcessedDataPoint, OptionDataPoint, FilterState } from '@/types';
import { generateMockOptionData } from '@/utils/mockData';
import { processDataPoints } from '@/utils/anomalyDetector';

const defaultFilters: FilterState = {
  expirationDates: [],
  strikePriceRange: [0, 10000],
  volatilityRange: [0, 1],
  showAnomaliesOnly: false,
  anomalyTypes: [],
};

export const useAppStore = create<AppStore>((set, get) => ({
  dataPoints: [],
  rawData: [],
  annotations: [],
  filters: defaultFilters,
  selectedPoint: null,
  hoveredPoint: null,
  isLoading: false,
  error: null,

  setDataPoints: (points: ProcessedDataPoint[]) => {
    set({ dataPoints: points });
  },

  setRawData: (data: OptionDataPoint[]) => {
    set({ rawData: data });
  },

  addAnnotation: (annotation) => {
    set((state) => ({
      annotations: [
        ...state.annotations,
        {
          ...annotation,
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString(),
        },
      ],
    }));
  },

  setFilters: (filters: Partial<FilterState>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  setSelectedPoint: (point: ProcessedDataPoint | null) => {
    set({ selectedPoint: point });
  },

  setHoveredPoint: (point: ProcessedDataPoint | null) => {
    set({ hoveredPoint: point });
  },

  resetFilters: () => {
    set({ filters: defaultFilters });
  },

  loadMockData: () => {
    set({ isLoading: true, error: null });
    try {
      const rawData = generateMockOptionData();
      const processedData = processDataPoints(rawData);
      
      const allExpirations = [...new Set(rawData.map(p => p.expirationDate))];
      const allStrikes = rawData.map(p => p.strikePrice);
      const allVols = rawData.map(p => p.impliedVolatility);
      
      set({
        rawData,
        dataPoints: processedData,
        isLoading: false,
        filters: {
          ...defaultFilters,
          expirationDates: allExpirations,
          strikePriceRange: [Math.min(...allStrikes), Math.max(...allStrikes)],
          volatilityRange: [Math.min(...allVols), Math.max(...allVols)],
        },
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load data',
        isLoading: false,
      });
    }
  },
}));

export const useFilteredDataPoints = () => {
  const { dataPoints, filters } = useAppStore();
  
  return dataPoints.filter(point => {
    if (filters.expirationDates.length > 0 && !filters.expirationDates.includes(point.expirationDate)) {
      return false;
    }
    
    if (point.strikePrice < filters.strikePriceRange[0] || point.strikePrice > filters.strikePriceRange[1]) {
      return false;
    }
    
    if (point.impliedVolatility < filters.volatilityRange[0] || point.impliedVolatility > filters.volatilityRange[1]) {
      return false;
    }
    
    if (filters.showAnomaliesOnly && point.anomalies.length === 0) {
      return false;
    }
    
    if (filters.anomalyTypes.length > 0) {
      const hasMatchingAnomaly = point.anomalies.some(a => filters.anomalyTypes.includes(a.type));
      if (!hasMatchingAnomaly) {
        return false;
      }
    }
    
    return true;
  });
};

export const useAnomalyStats = () => {
  const dataPoints = useAppStore(state => state.dataPoints);
  
  const stats = {
    total: dataPoints.length,
    withAnomalies: 0,
    missingQuotes: 0,
    spikes: 0,
    expirationMismatches: 0,
    outliers: 0,
    critical: 0,
    errors: 0,
    warnings: 0,
  };
  
  dataPoints.forEach(point => {
    if (point.anomalies.length > 0) {
      stats.withAnomalies++;
    }
    
    point.anomalies.forEach(anomaly => {
      switch (anomaly.type) {
        case 'missing_quote':
          stats.missingQuotes++;
          break;
        case 'spike':
          stats.spikes++;
          break;
        case 'expiration_mismatch':
          stats.expirationMismatches++;
          break;
        case 'outlier':
          stats.outliers++;
          break;
      }
      
      switch (anomaly.severity) {
        case 'critical':
          stats.critical++;
          break;
        case 'error':
          stats.errors++;
          break;
        case 'warning':
          stats.warnings++;
          break;
      }
    });
  });
  
  return stats;
};
