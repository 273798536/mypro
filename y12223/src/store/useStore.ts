import { create } from 'zustand';
import {
  FilmProject,
  SupplierBill,
  ExpenseReport,
  AdjustmentHistory,
  FilterConditions,
  BillSnapshot,
} from '../types';
import {
  filmProjects as initialProjects,
  supplierBills as initialBills,
  expenseReports as initialReports,
  adjustmentHistory as initialHistory,
} from '../data/mockData';

interface AppState {
  projects: FilmProject[];
  bills: SupplierBill[];
  reports: ExpenseReport[];
  history: AdjustmentHistory[];
  filters: FilterConditions;
  selectedBill: SupplierBill | null;
  isCompareMode: boolean;
  beforeSnapshot: BillSnapshot | null;
  afterSnapshot: BillSnapshot | null;

  setFilters: (filters: FilterConditions) => void;
  resetFilters: () => void;
  selectBill: (bill: SupplierBill | null) => void;
  updateBill: (billId: string, updates: Partial<SupplierBill>) => void;
  addHistoryRecord: (record: Omit<AdjustmentHistory, 'id' | 'operatedAt'>) => void;
  setCompareMode: (
    isOpen: boolean,
    before?: BillSnapshot | null,
    after?: BillSnapshot | null
  ) => void;

  getFilteredBills: () => SupplierBill[];
  getProjectById: (id: string) => FilmProject | undefined;
  getBillById: (id: string) => SupplierBill | undefined;
  getTotalExpense: () => number;
  getCollectedExpense: () => number;
  getPendingExpense: () => number;
  getAnomalyCount: () => number;
}

export const useStore = create<AppState>((set, get) => ({
  projects: initialProjects,
  bills: initialBills,
  reports: initialReports,
  history: initialHistory,
  filters: {},
  selectedBill: null,
  isCompareMode: false,
  beforeSnapshot: null,
  afterSnapshot: null,

  setFilters: (filters) => set({ filters }),

  resetFilters: () => set({ filters: {} }),

  selectBill: (bill) => set({ selectedBill: bill }),

  updateBill: (billId, updates) =>
    set((state) => ({
      bills: state.bills.map((bill) =>
        bill.id === billId ? { ...bill, ...updates } : bill
      ),
    })),

  addHistoryRecord: (record) =>
    set((state) => ({
      history: [
        {
          ...record,
          id: `adj-${Date.now()}`,
          operatedAt: new Date().toLocaleString('zh-CN'),
        },
        ...state.history,
      ],
    })),

  setCompareMode: (isOpen, before = null, after = null) =>
    set({
      isCompareMode: isOpen,
      beforeSnapshot: before,
      afterSnapshot: after,
    }),

  getFilteredBills: () => {
    const { bills, filters } = get();
    return bills.filter((bill) => {
      if (filters.projectId && bill.projectId !== filters.projectId) return false;
      if (filters.expenseCategory && bill.expenseCategory !== filters.expenseCategory)
        return false;
      if (filters.status && bill.status !== filters.status) return false;
      if (filters.dateRange) {
        const billDate = new Date(bill.billDate);
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        if (billDate < startDate || billDate > endDate) return false;
      }
      return true;
    });
  },

  getProjectById: (id) => get().projects.find((p) => p.id === id),

  getBillById: (id) => get().bills.find((b) => b.id === id),

  getTotalExpense: () => get().bills.reduce((sum, b) => sum + b.amount, 0),

  getCollectedExpense: () =>
    get()
      .bills.filter((b) => b.status === 'normal')
      .reduce((sum, b) => sum + b.amount, 0),

  getPendingExpense: () =>
    get()
      .bills.filter((b) => b.status === 'missing_fields' || b.status === 'late_supplement')
      .reduce((sum, b) => sum + b.amount, 0),

  getAnomalyCount: () =>
    get().bills.filter((b) => b.isCategoryMismatch || b.hasMissingFields).length,
}));
