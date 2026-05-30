import type { PolicySample, SimulationParams, SimulationResult, SensitivityResult } from '@/types';
import { create } from 'zustand';
import { runSimulation } from '@/utils/simulation';
import { parseCSV, generateSampleData } from '@/utils/csv-parser';

const DEFAULT_PARAMS: SimulationParams = {
  deductible: 5000,
  limit: 500000,
  expenseRatio: 0.25,
  safetyLoading: 0.1,
  iterations: 5000,
};

interface SimulationStore {
  policies: PolicySample[];
  params: SimulationParams;
  result: SimulationResult | null;
  sensitivityResults: SensitivityResult[];
  isRunning: boolean;
  progress: number;
  error: string | null;

  setPolicies: (policies: PolicySample[]) => void;
  loadSampleData: () => void;
  importCSV: (csvText: string) => void;
  updateParams: (partial: Partial<SimulationParams>) => void;
  runSim: () => void;
  runSensitivity: (paramName: string, delta: number) => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  policies: [],
  params: { ...DEFAULT_PARAMS },
  result: null,
  sensitivityResults: [],
  isRunning: false,
  progress: 0,
  error: null,

  setPolicies(policies) {
    set({ policies });
  },

  loadSampleData() {
    set({ policies: generateSampleData() });
  },

  importCSV(csvText) {
    const policies = parseCSV(csvText);
    if (policies.length === 0) {
      set({ error: 'CSV 解析失败，未获取到有效保单数据', policies: [] });
    } else {
      set({ policies, error: null });
    }
  },

  updateParams(partial) {
    set((state) => ({ params: { ...state.params, ...partial } }));
  },

  runSim() {
    const { policies, params } = get();
    set({ isRunning: true, progress: 0, error: null });

    setTimeout(() => {
      try {
        const result = runSimulation(policies, params, (pct) => {
          set({ progress: pct });
        });
        set({ result, isRunning: false });
      } catch (e) {
        set({ error: (e as Error).message, isRunning: false });
      }
    }, 0);
  },

  runSensitivity(paramName, delta) {
    const { result, policies, params } = get();
    if (!result) return;

    set({ isRunning: true, progress: 0, error: null });

    setTimeout(() => {
      try {
        const newParams = { ...params, [paramName]: (params[paramName as keyof SimulationParams] as number) + delta };
        const newResult = runSimulation(policies, newParams, (pct) => {
          set({ progress: pct });
        });

        const premiumDelta = newResult.grossPremium - result.grossPremium;
        const premiumDeltaPct = result.grossPremium !== 0 ? premiumDelta / result.grossPremium : 0;

        const sensitivityResult: SensitivityResult = {
          paramName,
          paramDelta: delta,
          originalResult: result,
          newResult,
          premiumDelta,
          premiumDeltaPct,
        };

        set((state) => ({
          sensitivityResults: [...state.sensitivityResults, sensitivityResult],
          isRunning: false,
        }));
      } catch (e) {
        set({ error: (e as Error).message, isRunning: false });
      }
    }, 0);
  },

  reset() {
    set({
      policies: [],
      params: { ...DEFAULT_PARAMS },
      result: null,
      sensitivityResults: [],
      isRunning: false,
      progress: 0,
      error: null,
    });
  },
}));
