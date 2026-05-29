import { create } from 'zustand';
import type { DataType, ValidationIssue, CalculationResult, CalculationFlag } from '../../shared/types';

interface AppState {
  activeTab: DataType;
  setActiveTab: (tab: DataType) => void;

  importWarnings: ValidationIssue[];
  setImportWarnings: (warnings: ValidationIssue[]) => void;

  calculations: CalculationResult[];
  setCalculations: (calcs: CalculationResult[]) => void;

  selectedCalcId: string | null;
  setSelectedCalcId: (id: string | null) => void;

  calcLoading: boolean;
  setCalcLoading: (loading: boolean) => void;

  importLoading: boolean;
  setImportLoading: (loading: boolean) => void;

  flagFilters: CalculationFlag[];
  toggleFlagFilter: (flag: CalculationFlag) => void;
  resetFlagFilters: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'berth',
  setActiveTab: (tab) => set({ activeTab: tab }),

  importWarnings: [],
  setImportWarnings: (warnings) => set({ importWarnings: warnings }),

  calculations: [],
  setCalculations: (calcs) => set({ calculations: calcs }),

  selectedCalcId: null,
  setSelectedCalcId: (id) => set({ selectedCalcId: id }),

  calcLoading: false,
  setCalcLoading: (loading) => set({ calcLoading: loading }),

  importLoading: false,
  setImportLoading: (loading) => set({ importLoading: loading }),

  flagFilters: [],
  toggleFlagFilter: (flag) =>
    set((state) => ({
      flagFilters: state.flagFilters.includes(flag)
        ? state.flagFilters.filter((f) => f !== flag)
        : [...state.flagFilters, flag],
    })),
  resetFlagFilters: () => set({ flagFilters: [] }),
}));
