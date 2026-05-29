import { create } from 'zustand';
import {
  Denomination,
  Inventory,
  Shift,
  Transaction,
  ChangePlan,
  SupplySuggestion,
  ChangeResult,
  ChangeDetail,
  SourceTrace,
} from '../types';
import { dpChangeWithInventory, generateSupplySuggestions } from '../utils/algorithm';
import { getInitialData } from '../data/mockData';

interface AppState {
  denominations: Denomination[];
  inventory: Inventory[];
  shifts: Shift[];
  transactions: Transaction[];
  currentShift: Shift | null;
  supplySuggestions: SupplySuggestion[];
  lastChangeResult: ChangeResult | null;
  currentOperator: string;

  initStore: () => void;
  setCurrentShift: (shiftId: string) => void;
  updateInventory: (denominationId: string, quantity: number) => void;
  bulkUpdateInventory: (updates: Record<string, number>) => void;
  calculateChange: (
    receivableAmount: number,
    receivedAmount: number
  ) => ChangeResult;
  executeTransaction: (
    receivableAmount: number,
    receivedAmount: number,
    selectedPlan: ChangePlan
  ) => Transaction | null;
  generateSupplySuggestions: () => void;
  addDenomination: (denomination: Omit<Denomination, 'id'>) => void;
  updateDenomination: (id: string, updates: Partial<Denomination>) => void;
  removeDenomination: (id: string) => void;
  clearData: () => void;
}

const STORAGE_KEY = 'cash-optimization-store';

function saveToStorage(state: Partial<AppState>) {
  try {
    const serialized = JSON.stringify(state, (key, value) => {
      if (value instanceof Date) return value.toISOString();
      return value;
    });
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

function loadFromStorage(): Partial<AppState> | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return null;
    return JSON.parse(serialized, (key, value) => {
      if (
        [
          'startTime',
          'endTime',
          'timestamp',
          'lastUpdated',
          'generatedAt',
        ].includes(key)
      ) {
        return new Date(value);
      }
      return value;
    });
  } catch (e) {
    console.error('Failed to load state:', e);
    return null;
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export const useStore = create<AppState>((set, get) => ({
  denominations: [],
  inventory: [],
  shifts: [],
  transactions: [],
  currentShift: null,
  supplySuggestions: [],
  lastChangeResult: null,
  currentOperator: '当前用户',

  initStore: () => {
    const saved = loadFromStorage();
    if (saved && saved.denominations && saved.denominations.length > 0) {
      set(saved);
    } else {
      const initial = getInitialData();
      set({
        denominations: initial.denominations,
        inventory: initial.inventory,
        shifts: initial.shifts,
        transactions: initial.transactions,
        currentShift: initial.currentShift,
        currentOperator: initial.currentShift.operator,
      });
      get().generateSupplySuggestions();
    }
  },

  setCurrentShift: (shiftId: string) => {
    const shift = get().shifts.find((s) => s.id === shiftId);
    if (shift) {
      set({ currentShift: shift, currentOperator: shift.operator });
      saveToStorage(get());
    }
  },

  updateInventory: (denominationId: string, quantity: number) => {
    set((state) => {
      const newInventory = state.inventory.map((inv) =>
        inv.denominationId === denominationId
          ? { ...inv, quantity, lastUpdated: new Date() }
          : inv
      );
      return { inventory: newInventory };
    });
    saveToStorage(get());
    get().generateSupplySuggestions();
  },

  bulkUpdateInventory: (updates: Record<string, number>) => {
    set((state) => {
      const newInventory = state.inventory.map((inv) =>
        updates[inv.denominationId] !== undefined
          ? {
              ...inv,
              quantity: updates[inv.denominationId],
              lastUpdated: new Date(),
            }
          : inv
      );
      return { inventory: newInventory };
    });
    saveToStorage(get());
    get().generateSupplySuggestions();
  },

  calculateChange: (receivableAmount: number, receivedAmount: number) => {
    const changeAmount = Math.round((receivedAmount - receivableAmount) * 100) / 100;
    const { denominations, inventory } = get();

    const inventoryMap: Record<string, number> = {};
    inventory.forEach((inv) => {
      inventoryMap[inv.denominationId] = inv.quantity;
    });

    const result = dpChangeWithInventory(changeAmount, denominations, inventoryMap);
    set({ lastChangeResult: result });
    return result;
  },

  executeTransaction: (
    receivableAmount: number,
    receivedAmount: number,
    selectedPlan: ChangePlan
  ) => {
    const { currentShift, currentOperator, denominations } = get();
    if (!currentShift) return null;

    const changeAmount = Math.round((receivedAmount - receivableAmount) * 100) / 100;

    const inventorySnapshot: Record<string, number> = {};
    get().inventory.forEach((inv) => {
      inventorySnapshot[inv.denominationId] = inv.quantity;
    });

    const sourceTrace: SourceTrace = {
      algorithm: selectedPlan.algorithm,
      inventorySnapshot,
      timestamp: new Date(),
      operator: currentOperator,
    };

    const changeDetails: ChangeDetail[] = selectedPlan.denominationBreakdown.map(
      (d) => ({
        denominationId: d.denominationId,
        quantity: d.quantity,
        value: d.value,
      })
    );

    const hasWarnings =
      selectedPlan.algorithm.includes('relaxed') ||
      selectedPlan.algorithm.includes('fallback');

    const transaction: Transaction = {
      id: generateId(),
      shiftId: currentShift.id,
      receivableAmount,
      receivedAmount,
      changeAmount,
      timestamp: new Date(),
      operator: currentOperator,
      status: hasWarnings ? 'warning' : 'success',
      changeDetails,
      sourceTrace,
    };

    const inventoryUpdates: Record<string, number> = {};
    selectedPlan.denominationBreakdown.forEach((detail) => {
      const currentInv = get().inventory.find(
        (i) => i.denominationId === detail.denominationId
      );
      if (currentInv) {
        inventoryUpdates[detail.denominationId] = Math.max(
          0,
          currentInv.quantity - detail.quantity
        );
      }
    });

    set((state) => ({
      transactions: [...state.transactions, transaction],
    }));

    get().bulkUpdateInventory(inventoryUpdates);
    saveToStorage(get());

    return transaction;
  },

  generateSupplySuggestions: () => {
    const { inventory, transactions, denominations } = get();
    const suggestions = generateSupplySuggestions(
      inventory,
      transactions,
      denominations
    );
    set({ supplySuggestions: suggestions });
  },

  addDenomination: (denomination: Omit<Denomination, 'id'>) => {
    const newDenom: Denomination = {
      ...denomination,
      id: generateId(),
    };
    set((state) => ({
      denominations: [...state.denominations, newDenom].sort(
        (a, b) => b.value - a.value
      ),
    }));
    saveToStorage(get());
  },

  updateDenomination: (id: string, updates: Partial<Denomination>) => {
    set((state) => ({
      denominations: state.denominations.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    }));
    saveToStorage(get());
  },

  removeDenomination: (id: string) => {
    set((state) => ({
      denominations: state.denominations.filter((d) => d.id !== id),
    }));
    saveToStorage(get());
  },

  clearData: () => {
    localStorage.removeItem(STORAGE_KEY);
    const initial = getInitialData();
    set({
      denominations: initial.denominations,
      inventory: initial.inventory,
      shifts: initial.shifts,
      transactions: initial.transactions,
      currentShift: initial.currentShift,
      supplySuggestions: [],
      lastChangeResult: null,
      currentOperator: initial.currentShift.operator,
    });
    get().generateSupplySuggestions();
  },
}));
