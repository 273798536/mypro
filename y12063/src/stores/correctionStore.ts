import { create } from 'zustand';
import type { DebtConfig, GameState, DifferenceItem } from '../types';
import { recalculateWithDebt } from '../utils/gameEngine';

interface CorrectionStore {
  originalResult: GameState | null;
  modifiedDebt: DebtConfig | null;
  modifiedResult: GameState | null;
  differences: DifferenceItem[];

  initCorrection: (originalState: GameState) => void;
  updateDebt: (newDebt: DebtConfig) => void;
  clearCorrection: () => void;
}

function computeDifferences(original: GameState, modified: GameState): DifferenceItem[] {
  const items: DifferenceItem[] = [
    { field: 'cash', label: '最终现金', originalValue: original.cash, modifiedValue: modified.cash, delta: modified.cash - original.cash },
    { field: 'debtBalance', label: '债务余额', originalValue: original.debtBalance, modifiedValue: modified.debtBalance, delta: modified.debtBalance - original.debtBalance },
    { field: 'totalInterestPaid', label: '累计利息', originalValue: original.totalInterestPaid, modifiedValue: modified.totalInterestPaid, delta: modified.totalInterestPaid - original.totalInterestPaid },
    { field: 'totalProjectRevenue', label: '项目收益', originalValue: original.totalProjectRevenue, modifiedValue: modified.totalProjectRevenue, delta: modified.totalProjectRevenue - original.totalProjectRevenue },
    {
      field: 'netWorth',
      label: '净资产',
      originalValue: original.cash - original.debtBalance,
      modifiedValue: modified.cash - modified.debtBalance,
      delta: (modified.cash - modified.debtBalance) - (original.cash - original.debtBalance),
    },
    { field: 'deductions', label: '扣分总额', originalValue: original.deductions.reduce((s, d) => s + d.amount, 0), modifiedValue: modified.deductions.reduce((s, d) => s + d.amount, 0), delta: modified.deductions.reduce((s, d) => s + d.amount, 0) - original.deductions.reduce((s, d) => s + d.amount, 0) },
  ];
  return items;
}

export const useCorrectionStore = create<CorrectionStore>((set, get) => ({
  originalResult: null,
  modifiedDebt: null,
  modifiedResult: null,
  differences: [],

  initCorrection: (originalState: GameState) => {
    set({
      originalResult: originalState,
      modifiedDebt: { ...originalState.config.debt },
      modifiedResult: null,
      differences: [],
    });
  },

  updateDebt: (newDebt: DebtConfig) => {
    const { originalResult } = get();
    if (!originalResult) return;

    const modifiedResult = recalculateWithDebt(originalResult, newDebt);
    const differences = computeDifferences(originalResult, modifiedResult);

    set({ modifiedDebt: newDebt, modifiedResult, differences });
  },

  clearCorrection: () => {
    set({ originalResult: null, modifiedDebt: null, modifiedResult: null, differences: [] });
  },
}));
