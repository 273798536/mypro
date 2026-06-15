import { create } from 'zustand';
import type { CalculationRule } from '@/types';
import { mockCalculationRules } from '@/data/mockData';

interface CalculationStoreState {
  rules: CalculationRule[];
  loading: boolean;
  error: string | null;
  selectedRuleId: string | null;
}

interface CalculationStoreActions {
  fetchRules: () => Promise<void>;
  getRuleById: (id: string) => CalculationRule | undefined;
  selectRule: (id: string | null) => void;
}

type CalculationStore = CalculationStoreState & CalculationStoreActions;

export const useCalculationStore = create<CalculationStore>((set, get) => ({
  rules: [],
  loading: false,
  error: null,
  selectedRuleId: null,

  fetchRules: async () => {
    set({ loading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      const rules = JSON.parse(JSON.stringify(mockCalculationRules));
      set({ rules, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载计算规则失败', loading: false });
    }
  },

  getRuleById: (id: string) => {
    return get().rules.find(r => r.id === id);
  },

  selectRule: (id: string | null) => {
    set({ selectedRuleId: id });
  },
}));
