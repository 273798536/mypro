import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FilterState, ReconciliationStatus } from '@/types';

const STORAGE_KEY = 'futures-basis-recon::filter::v1';

interface FilterStore extends FilterState {
  filterDrawerOpen: boolean;
  setStatus: (status: ReconciliationStatus[]) => void;
  toggleStatus: (s: ReconciliationStatus) => void;
  setDateFrom: (v: string | null) => void;
  setDateTo: (v: string | null) => void;
  setContractCode: (v: string) => void;
  setIsPaymentSplit: (v: boolean | null) => void;
  setDrawerOpen: (v: boolean) => void;
  reset: () => void;
  snapshot: () => FilterState;
}

const initial: FilterState = {
  status: [],
  dateFrom: null,
  dateTo: null,
  contractCode: '',
  isPaymentSplit: null,
};

export const useFilterStore = create<FilterStore>()(
  persist(
    (set, get) => ({
      ...initial,
      filterDrawerOpen: false,
      setStatus: (status) => set({ status }),
      toggleStatus: (s) =>
        set((state) => ({
          status: state.status.includes(s)
            ? state.status.filter((x) => x !== s)
            : [...state.status, s],
        })),
      setDateFrom: (dateFrom) => set({ dateFrom }),
      setDateTo: (dateTo) => set({ dateTo }),
      setContractCode: (contractCode) => set({ contractCode }),
      setIsPaymentSplit: (isPaymentSplit) => set({ isPaymentSplit }),
      setDrawerOpen: (filterDrawerOpen) => set({ filterDrawerOpen }),
      reset: () => set({ ...initial }),
      snapshot: () => {
        const s = get();
        return {
          status: s.status,
          dateFrom: s.dateFrom,
          dateTo: s.dateTo,
          contractCode: s.contractCode,
          isPaymentSplit: s.isPaymentSplit,
        };
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export function applyFilter(
  records: import('@/types').Reconciliation[],
  f: FilterState
) {
  return records.filter((r) => {
    if (f.status.length && !f.status.includes(r.status)) return false;
    if (f.dateFrom && r.tradeDate < f.dateFrom) return false;
    if (f.dateTo && r.tradeDate > f.dateTo) return false;
    if (f.contractCode && !r.contractCode.toLowerCase().includes(f.contractCode.toLowerCase()))
      return false;
    if (f.isPaymentSplit !== null && r.isPaymentSplit !== f.isPaymentSplit) return false;
    return true;
  });
}
