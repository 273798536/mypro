import { create } from 'zustand';
import { BatteryState, Filters, CycleRecord } from '../types';
import { mockBatteryBatch } from '../data/mockData';
import { fitExponentialDecay } from '../utils/fitting';
import { exportToCSV, exportChartAsPNG, generateReportSummary } from '../utils/export';

const initialFilters: Filters = {
  chargeRateRange: [0, 5],
  temperatureRange: [20, 50],
  anomalyTypes: []
};

const filterCycles = (cycles: CycleRecord[], filters: Filters): CycleRecord[] => {
  let filtered = cycles;
  
  filtered = filtered.filter(c => 
    c.chargeRate >= filters.chargeRateRange[0] && 
    c.chargeRate <= filters.chargeRateRange[1]
  );
  
  filtered = filtered.filter(c => 
    c.avgTemperature >= filters.temperatureRange[0] && 
    c.avgTemperature <= filters.temperatureRange[1]
  );
  
  if (filters.anomalyTypes.length > 0) {
    filtered = filtered.filter(c => 
      c.anomalies.some(a => filters.anomalyTypes.includes(a.type))
    );
  }
  
  return filtered;
};

const createFilteredBatch = (
  original: typeof mockBatteryBatch,
  filteredCycles: CycleRecord[]
) => ({
  ...original,
  cycles: filteredCycles,
  name: `${original.name}_筛选后_${filteredCycles.length}条`
});

export const useBatteryStore = create<BatteryState>((set, get) => ({
  currentBatch: mockBatteryBatch,
  currentCycleIndex: 0,
  isPlaying: false,
  playbackSpeed: 1,
  filters: initialFilters,
  filteredCycles: mockBatteryBatch.cycles,
  fittingParams: null,
  selectedAnomaly: null,
  showDetailModal: false,

  setCycleIndex: (index: number) => {
    const { currentBatch } = get();
    if (currentBatch && index >= 0 && index < currentBatch.cycles.length) {
      set({ currentCycleIndex: index });
    }
  },

  togglePlayback: () => {
    set({ isPlaying: !get().isPlaying });
  },

  setPlaybackSpeed: (speed: number) => {
    set({ playbackSpeed: speed });
  },

  setFilters: (filters: Partial<Filters>) => {
    set({ filters: { ...get().filters, ...filters } });
    get().applyFilters();
  },

  resetFilters: () => {
    set({ filters: initialFilters });
    get().applyFilters();
  },

  applyFilters: () => {
    const { currentBatch, filters } = get();
    if (!currentBatch) return;

    const filtered = filterCycles(currentBatch.cycles, filters);
    
    set({ filteredCycles: filtered });

    if (filtered.length >= 10) {
      const params = fitExponentialDecay(filtered);
      set({ fittingParams: params });
    } else {
      set({ fittingParams: null });
    }
  },

  selectAnomaly: (anomaly) => {
    set({ selectedAnomaly: anomaly, showDetailModal: anomaly !== null });
  },

  setShowDetailModal: (show: boolean) => {
    set({ showDetailModal: show });
  },

  calculateFitting: () => {
    get().applyFilters();
  },

  exportReport: (format: 'csv' | 'png', chartRef) => {
    const { currentBatch, filteredCycles, fittingParams, filters } = get();
    if (!currentBatch) return;

    const isFiltered = 
      filters.chargeRateRange[0] !== initialFilters.chargeRateRange[0] ||
      filters.chargeRateRange[1] !== initialFilters.chargeRateRange[1] ||
      filters.temperatureRange[0] !== initialFilters.temperatureRange[0] ||
      filters.temperatureRange[1] !== initialFilters.temperatureRange[1] ||
      filters.anomalyTypes.length > 0;

    const exportCycles = isFiltered ? filteredCycles : currentBatch.cycles;
    const exportBatch = isFiltered 
      ? createFilteredBatch(currentBatch, exportCycles)
      : currentBatch;

    if (format === 'csv') {
      const summary = generateReportSummary(exportBatch, fittingParams);
      exportToCSV(exportBatch, fittingParams, summary);
    } else if (format === 'png' && chartRef) {
      exportChartAsPNG(chartRef, fittingParams, filters);
    }
  }
}));
