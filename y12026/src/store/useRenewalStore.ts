import { create } from 'zustand';
import type { FilterConditions, PaginationState, FeeCalculationResult, RenewalRecord } from '@/types';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import { calculateRenewalFee, checkReviewStatus } from '@/services/calculator';
import { useDataStore } from './useDataStore';

interface RenewalState {
  filterConditions: FilterConditions;
  pagination: PaginationState;
  selectedIds: string[];
  calculationResult: FeeCalculationResult | null;
  isCalculating: boolean;
  activeTraceId: string | null;
  isTraceModalOpen: boolean;
  
  setFilterConditions: (conditions: FilterConditions) => void;
  resetFilterConditions: () => void;
  
  setPagination: (pagination: Partial<PaginationState>) => void;
  
  toggleSelected: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  
  calculateFee: (cardId: string, months: number) => void;
  clearCalculation: () => void;
  
  openTraceModal: (renewalId: string) => void;
  closeTraceModal: () => void;
  
  filterRenewalRecords: () => void;
  getFilteredRecords: () => RenewalRecord[];
}

const initialFilterConditions: FilterConditions = {
  plateNumber: '',
  ownerName: '',
  building: '',
  status: [],
  reviewStatus: [],
  hasTempParkingDeduction: undefined,
  hasDiscount: undefined,
  discountExpired: undefined,
  dateRange: undefined,
};

export const useRenewalStore = create<RenewalState>((set, get) => ({
  filterConditions: initialFilterConditions,
  pagination: {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
  },
  selectedIds: [],
  calculationResult: null,
  isCalculating: false,
  activeTraceId: null,
  isTraceModalOpen: false,

  setFilterConditions: (conditions) => {
    set({
      filterConditions: { ...get().filterConditions, ...conditions },
      pagination: { ...get().pagination, page: 1 },
    });
  },

  resetFilterConditions: () => {
    set({
      filterConditions: initialFilterConditions,
      pagination: { ...get().pagination, page: 1 },
    });
  },

  setPagination: (pagination) => {
    set((state) => ({
      pagination: { ...state.pagination, ...pagination },
    }));
  },

  toggleSelected: (id) => {
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((i) => i !== id)
        : [...state.selectedIds, id],
    }));
  },

  selectAll: (ids) => {
    set({ selectedIds: ids });
  },

  clearSelection: () => {
    set({ selectedIds: [] });
  },

  calculateFee: (cardId, months) => {
    set({ isCalculating: true });
    
    const dataState = useDataStore.getState();
    const monthlyCard = dataState.monthlyCards.find((c) => c.id === cardId);
    
    if (!monthlyCard) {
      set({ isCalculating: false, calculationResult: null });
      return;
    }

    const tempParkingRecords = dataState.tempParkingRecords.filter(
      (r) => r.plateNumber === monthlyCard.plateNumber
    );
    
    const plate = dataState.licensePlates.find(
      (p) => p.plateNumber === monthlyCard.plateNumber
    );
    
    const discounts = plate
      ? dataState.discounts.filter((d) => d.ownerId === plate.ownerId)
      : [];

    const result = calculateRenewalFee(monthlyCard, tempParkingRecords, discounts, months);
    
    set({ calculationResult: result, isCalculating: false });
  },

  clearCalculation: () => {
    set({ calculationResult: null });
  },

  openTraceModal: (renewalId) => {
    set({ activeTraceId: renewalId, isTraceModalOpen: true });
  },

  closeTraceModal: () => {
    set({ activeTraceId: null, isTraceModalOpen: false });
  },

  filterRenewalRecords: () => {
    const { filterConditions } = get();
    const dataState = useDataStore.getState();
    
    let filtered = [...dataState.renewalRecords];

    if (filterConditions.plateNumber) {
      filtered = filtered.filter((r) =>
        r.plateNumber.toLowerCase().includes(filterConditions.plateNumber!.toLowerCase())
      );
    }

    if (filterConditions.ownerName) {
      filtered = filtered.filter((r) =>
        r.ownerName.includes(filterConditions.ownerName!)
      );
    }

    if (filterConditions.building) {
      filtered = filtered.filter((r) => r.building === filterConditions.building);
    }

    if (filterConditions.status && filterConditions.status.length > 0) {
      filtered = filtered.filter((r) => filterConditions.status!.includes(r.status));
    }

    if (filterConditions.reviewStatus && filterConditions.reviewStatus.length > 0) {
      filtered = filtered.filter((r) =>
        filterConditions.reviewStatus!.includes(r.reviewStatus)
      );
    }

    if (filterConditions.hasTempParkingDeduction !== undefined) {
      filtered = filtered.filter((r) =>
        filterConditions.hasTempParkingDeduction!
          ? r.tempParkingDeduction > 0
          : r.tempParkingDeduction === 0
      );
    }

    if (filterConditions.hasDiscount !== undefined) {
      filtered = filtered.filter((r) =>
        filterConditions.hasDiscount!
          ? r.discountAmount > 0
          : r.discountAmount === 0
      );
    }

    set((state) => ({
      pagination: { ...state.pagination, total: filtered.length },
    }));
  },

  getFilteredRecords: () => {
    const { filterConditions, pagination } = get();
    const dataState = useDataStore.getState();
    
    let filtered = [...dataState.renewalRecords];

    if (filterConditions.plateNumber) {
      filtered = filtered.filter((r) =>
        r.plateNumber.toLowerCase().includes(filterConditions.plateNumber!.toLowerCase())
      );
    }

    if (filterConditions.ownerName) {
      filtered = filtered.filter((r) =>
        r.ownerName.includes(filterConditions.ownerName!)
      );
    }

    if (filterConditions.building) {
      filtered = filtered.filter((r) => r.building === filterConditions.building);
    }

    if (filterConditions.status && filterConditions.status.length > 0) {
      filtered = filtered.filter((r) => filterConditions.status!.includes(r.status));
    }

    if (filterConditions.reviewStatus && filterConditions.reviewStatus.length > 0) {
      filtered = filtered.filter((r) =>
        filterConditions.reviewStatus!.includes(r.reviewStatus)
      );
    }

    if (filterConditions.hasTempParkingDeduction !== undefined) {
      filtered = filtered.filter((r) =>
        filterConditions.hasTempParkingDeduction!
          ? r.tempParkingDeduction > 0
          : r.tempParkingDeduction === 0
      );
    }

    if (filterConditions.hasDiscount !== undefined) {
      filtered = filtered.filter((r) =>
        filterConditions.hasDiscount!
          ? r.discountAmount > 0
          : r.discountAmount === 0
      );
    }

    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    
    return filtered.slice(start, end);
  },
}));
