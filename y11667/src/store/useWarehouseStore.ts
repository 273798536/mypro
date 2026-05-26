import { create } from 'zustand';
import { StorageSlot, WarehouseReceipt, Alert, FilterOptions, OperationHistory } from '@/types';
import { MOCK_SLOTS, MOCK_RECEIPTS, MOCK_HISTORY } from '@/data/mockData';
import { generateAllAlerts, filterSlots } from '@/utils/validation';

interface WarehouseState {
  slots: StorageSlot[];
  receipts: WarehouseReceipt[];
  alerts: Alert[];
  history: OperationHistory[];
  filters: FilterOptions;
  selectedSlotId: string | null;
  hoveredSlotId: string | null;
  dataVersion: string;

  setSelectedSlot: (id: string | null) => void;
  setHoveredSlot: (id: string | null) => void;
  setFilters: (filters: Partial<FilterOptions>) => void;
  resetFilters: () => void;
  addHistory: (entry: Omit<OperationHistory, 'id' | 'timestamp'>) => void;
  getFilteredSlots: () => StorageSlot[];
  focusSlot: (slotId: string) => void;
}

const initialFilters: FilterOptions = {
  batchNumbers: [],
  warehouses: [],
  qualityStatus: [],
  deliveryDateRange: null,
};

export const useWarehouseStore = create<WarehouseState>((set, get) => ({
  slots: MOCK_SLOTS,
  receipts: MOCK_RECEIPTS,
  alerts: generateAllAlerts(MOCK_SLOTS, MOCK_RECEIPTS),
  history: MOCK_HISTORY,
  filters: initialFilters,
  selectedSlotId: null,
  hoveredSlotId: null,
  dataVersion: `v1.0.0-${Date.now()}`,

  setSelectedSlot: (id) => set({ selectedSlotId: id }),

  setHoveredSlot: (id) => set({ hoveredSlotId: id }),

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  resetFilters: () => set({ filters: initialFilters }),

  addHistory: (entry) =>
    set((state) => {
      const newEntry: OperationHistory = {
        ...entry,
        id: `H-${String(state.history.length + 1).padStart(3, '0')}`,
        timestamp: new Date().toISOString(),
      };
      const updatedHistory = [newEntry, ...state.history];
      try {
        localStorage.setItem('warehouse-history', JSON.stringify(updatedHistory));
      } catch (e) {
        console.warn('Failed to save history to localStorage', e);
      }
      return { history: updatedHistory };
    }),

  getFilteredSlots: () => {
    const { slots, filters } = get();
    return filterSlots(slots, filters);
  },

  focusSlot: (slotId) => {
    set({ selectedSlotId: slotId, hoveredSlotId: slotId });
  },
}));

try {
  const savedHistory = localStorage.getItem('warehouse-history');
  if (savedHistory) {
    const parsed = JSON.parse(savedHistory) as OperationHistory[];
    useWarehouseStore.setState({ history: parsed });
  }
} catch (e) {
  console.warn('Failed to load history from localStorage', e);
}
