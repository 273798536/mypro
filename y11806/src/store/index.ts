import { create } from 'zustand';
import type { SettlementPeriod, ShopOrder, CashFlowForecast, PendingItem, FeeBreakdown } from '@/types';

interface AppState {
  periods: SettlementPeriod[];
  selectedPeriodId: string | null;
  orders: ShopOrder[];
  cashFlow: CashFlowForecast[];
  pendingItems: PendingItem[];
  feeBreakdown: FeeBreakdown | null;
  loading: boolean;
  filters: {
    dateRange: { start: string; end: string } | null;
    shopName: string;
    status: string;
  };
  setPeriods: (periods: SettlementPeriod[]) => void;
  setSelectedPeriodId: (id: string | null) => void;
  setOrders: (orders: ShopOrder[]) => void;
  setCashFlow: (cashFlow: CashFlowForecast[]) => void;
  setPendingItems: (items: PendingItem[]) => void;
  setFeeBreakdown: (breakdown: FeeBreakdown | null) => void;
  setLoading: (loading: boolean) => void;
  setFilters: (filters: Partial<AppState['filters']>) => void;
  confirmPendingItem: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  periods: [],
  selectedPeriodId: null,
  orders: [],
  cashFlow: [],
  pendingItems: [],
  feeBreakdown: null,
  loading: false,
  filters: {
    dateRange: null,
    shopName: '',
    status: '',
  },
  setPeriods: (periods) => set({ periods }),
  setSelectedPeriodId: (id) => set({ selectedPeriodId: id }),
  setOrders: (orders) => set({ orders }),
  setCashFlow: (cashFlow) => set({ cashFlow }),
  setPendingItems: (pendingItems) => set({ pendingItems }),
  setFeeBreakdown: (feeBreakdown) => set({ feeBreakdown }),
  setLoading: (loading) => set({ loading }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters })),
  confirmPendingItem: (id) =>
    set((state) => ({
      pendingItems: state.pendingItems.map((item) =>
        item.id === id ? { ...item, status: 'confirmed' } : item
      ),
    })),
}));
