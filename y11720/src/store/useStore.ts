import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CalculationParams, CalculationResult, Report } from '../types';
import { STORAGE_KEYS, MAX_CALCULATIONS, MAX_REPORTS } from '../utils/constants';

interface AppState {
  calculations: CalculationParams[];
  currentCalculation: CalculationParams | null;
  currentResult: CalculationResult | null;
  reports: Report[];
  selectedCompareIds: string[];
  
  setCurrentCalculation: (calc: CalculationParams | null) => void;
  setCurrentResult: (result: CalculationResult | null) => void;
  addCalculation: (calc: CalculationParams) => void;
  updateCalculation: (id: string, calc: CalculationParams) => void;
  deleteCalculation: (id: string) => void;
  clearCalculations: () => void;
  
  addReport: (report: Report) => void;
  deleteReport: (id: string) => void;
  clearReports: () => void;
  
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  
  importCalculations: (calcs: CalculationParams[]) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      calculations: [],
      currentCalculation: null,
      currentResult: null,
      reports: [],
      selectedCompareIds: [],

      setCurrentCalculation: (calc) => set({ currentCalculation: calc }),
      setCurrentResult: (result) => set({ currentResult: result }),

      addCalculation: (calc) => {
        const existing = get().calculations;
        const updated = [calc, ...existing].slice(0, MAX_CALCULATIONS);
        set({ calculations: updated });
      },

      updateCalculation: (id, calc) => {
        const updated = get().calculations.map((c) =>
          c.id === id ? calc : c
        );
        set({ calculations: updated });
      },

      deleteCalculation: (id) => {
        const updated = get().calculations.filter((c) => c.id !== id);
        const { currentCalculation, selectedCompareIds } = get();
        set({
          calculations: updated,
          currentCalculation: currentCalculation?.id === id ? null : currentCalculation,
          selectedCompareIds: selectedCompareIds.filter((cid) => cid !== id),
        });
      },

      clearCalculations: () => {
        set({
          calculations: [],
          currentCalculation: null,
          currentResult: null,
          selectedCompareIds: [],
        });
      },

      addReport: (report) => {
        const existing = get().reports;
        const updated = [report, ...existing].slice(0, MAX_REPORTS);
        set({ reports: updated });
      },

      deleteReport: (id) => {
        const updated = get().reports.filter((r) => r.id !== id);
        set({ reports: updated });
      },

      clearReports: () => set({ reports: [] }),

      toggleCompare: (id) => {
        const selected = get().selectedCompareIds;
        if (selected.includes(id)) {
          set({ selectedCompareIds: selected.filter((cid) => cid !== id) });
        } else if (selected.length < 5) {
          set({ selectedCompareIds: [...selected, id] });
        }
      },

      clearCompare: () => set({ selectedCompareIds: [] }),

      importCalculations: (calcs) => {
        const existing = get().calculations;
        const updated = [...calcs, ...existing].slice(0, MAX_CALCULATIONS);
        set({ calculations: updated });
      },
    }),
    {
      name: STORAGE_KEYS.CALCULATIONS,
      partialize: (state) => ({
        calculations: state.calculations,
        reports: state.reports,
        selectedCompareIds: state.selectedCompareIds,
      }),
    }
  )
);
