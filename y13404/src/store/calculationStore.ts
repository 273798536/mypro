import { create } from 'zustand';
import type { FilterConfig, CalculationResult } from '@/types';
import { defaultFilters } from '@/types';
import { generateCalculationResult } from '@/utils/mockData';

interface CalculationState {
  filters: FilterConfig;
  currentResult: CalculationResult | null;
  isCalculating: boolean;
  lastCalcTime: Date | null;
  updateFilters: (newFilters: Partial<FilterConfig>) => void;
  recalculate: () => void;
  resetFilters: () => void;
}

export const useCalculationStore = create<CalculationState>((set, get) => ({
  filters: defaultFilters,
  currentResult: generateCalculationResult(defaultFilters),
  isCalculating: false,
  lastCalcTime: new Date(),

  updateFilters: (newFilters: Partial<FilterConfig>) => {
    const updatedFilters = { ...get().filters, ...newFilters };
    set({
      filters: updatedFilters,
      isCalculating: true,
    });

    setTimeout(() => {
      const result = generateCalculationResult(updatedFilters);
      set({
        currentResult: result,
        isCalculating: false,
        lastCalcTime: new Date(),
      });
    }, 300);
  },

  recalculate: () => {
    set({ isCalculating: true });
    setTimeout(() => {
      const result = generateCalculationResult(get().filters);
      set({
        currentResult: result,
        isCalculating: false,
        lastCalcTime: new Date(),
      });
    }, 500);
  },

  resetFilters: () => {
    set({
      filters: defaultFilters,
      isCalculating: true,
    });
    setTimeout(() => {
      const result = generateCalculationResult(defaultFilters);
      set({
        currentResult: result,
        isCalculating: false,
        lastCalcTime: new Date(),
      });
    }, 300);
  },
}));
