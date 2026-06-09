import { create } from 'zustand';
import type {
  ExperimentBatch,
  CheckResult,
  ProcessError,
  BalanceCalcInput,
  BalanceCalcOutput,
} from '@/types';

interface StoreState {
  batches: ExperimentBatch[];
  currentBatchId: string | null;
  checkResults: Record<string, CheckResult>;
  errors: ProcessError[];
  balanceInput: BalanceCalcInput;
  balanceOutput: BalanceCalcOutput;
}

interface StoreActions {
  addBatch: (batch: ExperimentBatch) => void;
  updateBatch: (batchId: string, updates: Partial<ExperimentBatch>) => void;
  setCurrentBatch: (batchId: string | null) => void;
  addCheckResult: (result: CheckResult) => void;
  addError: (error: ProcessError) => void;
  clearErrors: () => void;
  setBalanceInput: (input: Partial<BalanceCalcInput>) => void;
  setBalanceOutput: (output: Partial<BalanceCalcOutput>) => void;
  hydrateFromStorage: () => void;
}

const BATCHES_KEY = 'impurity-check-batches';
const RESULTS_KEY = 'impurity-check-results';

const loadBatches = (): ExperimentBatch[] => {
  try {
    const stored = localStorage.getItem(BATCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const loadCheckResults = (): Record<string, CheckResult> => {
  try {
    const stored = localStorage.getItem(RESULTS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

export const useStore = create<StoreState & StoreActions>((set, get) => ({
  batches: loadBatches(),
  currentBatchId: null,
  checkResults: loadCheckResults(),
  errors: [],
  balanceInput: {},
  balanceOutput: {},

  addBatch: (batch) => {
    set((state) => {
      const batches = [...state.batches, batch];
      localStorage.setItem(BATCHES_KEY, JSON.stringify(batches));
      return { batches };
    });
  },

  updateBatch: (batchId, updates) => {
    set((state) => {
      const batches = state.batches.map((b) =>
        b.batchId === batchId ? { ...b, ...updates, updatedAt: Date.now() } : b
      );
      localStorage.setItem(BATCHES_KEY, JSON.stringify(batches));
      return { batches };
    });
  },

  setCurrentBatch: (batchId) => {
    set({ currentBatchId: batchId });
  },

  addCheckResult: (result) => {
    set((state) => {
      const checkResults = { ...state.checkResults, [result.batchId]: result };
      localStorage.setItem(RESULTS_KEY, JSON.stringify(checkResults));
      return { checkResults };
    });
  },

  addError: (error) => {
    set((state) => ({ errors: [...state.errors, error] }));
  },

  clearErrors: () => {
    set({ errors: [] });
  },

  setBalanceInput: (input) => {
    set((state) => ({ balanceInput: { ...state.balanceInput, ...input } }));
  },

  setBalanceOutput: (output) => {
    set((state) => ({ balanceOutput: { ...state.balanceOutput, ...output } }));
  },

  hydrateFromStorage: () => {
    set({
      batches: loadBatches(),
      checkResults: loadCheckResults(),
    });
  },
}));
