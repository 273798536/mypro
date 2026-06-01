import { create } from 'zustand';
import { BatteryState, Filters } from '../types';
import { mockBatteryBatch } from '../data/mockData';
import { fitExponentialDecay } from '../utils/fitting';
import { exportToCSV } from '../utils/export';

const initialFilters: Filters = {
  chargeRateRange: [0, 5],
  temperatureRange: [20, 50],
  anomalyTypes: []
};

export const useBatteryStore = create<BatteryState>((set, get) => ({
  currentBatch: mockBatteryBatch,
  currentCycleIndex: 0,
  isPlaying: false,
  playbackSpeed: 1,
  filters: initialFilters,
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
    get().calculateFitting();
  },

  selectAnomaly: (anomaly) => {
    set({ selectedAnomaly: anomaly, showDetailModal: anomaly !== null });
  },

  setShowDetailModal: (show: boolean) => {
    set({ showDetailModal: show });
  },

  calculateFitting: () => {
    const { currentBatch, filters } = get();
    if (!currentBatch) return;

    let filteredCycles = currentBatch.cycles;
    
    filteredCycles = filteredCycles.filter(c => 
      c.chargeRate >= filters.chargeRateRange[0] && 
      c.chargeRate <= filters.chargeRateRange[1]
    );
    
    filteredCycles = filteredCycles.filter(c => 
      c.avgTemperature >= filters.temperatureRange[0] && 
      c.avgTemperature <= filters.temperatureRange[1]
    );

    if (filteredCycles.length >= 10) {
      const params = fitExponentialDecay(filteredCycles);
      set({ fittingParams: params });
    }
  },

  exportReport: (format: 'csv' | 'png') => {
    const { currentBatch, fittingParams } = get();
    if (!currentBatch) return;

    if (format === 'csv') {
      exportToCSV(currentBatch, fittingParams);
    }
  }
}));
