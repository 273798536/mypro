import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FilterCriteria, Remark, StatusTab, WarningRecord, WarningStatus } from '@/types';
import { generateMockWarnings } from '@/utils/mockData';

interface WarningState {
  warnings: WarningRecord[];
  filters: FilterCriteria;
  activeStatusTab: StatusTab;
  sampleLoaded: boolean;
  setFilters: (filters: Partial<FilterCriteria>) => void;
  resetFilters: () => void;
  setActiveStatusTab: (tab: StatusTab) => void;
  addRemark: (warningId: string, remark: Omit<Remark, 'id' | 'createdAt'>) => void;
  updateStatus: (warningId: string, status: WarningStatus, operator?: string) => void;
  rerunWarnings: () => void;
  loadSampleData: () => void;
  getFilteredWarnings: () => WarningRecord[];
  getWarningById: (id: string) => WarningRecord | undefined;
  getStatusCounts: () => Record<StatusTab, number>;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function nowStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const useWarningStore = create<WarningState>()(
  persist(
    (set, get) => ({
      warnings: [],
      filters: {},
      activeStatusTab: 'all',
      sampleLoaded: false,

      setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),

      resetFilters: () => set({ filters: {} }),

      setActiveStatusTab: (tab) => set({ activeStatusTab: tab }),

      addRemark: (warningId, remark) =>
        set((s) => ({
          warnings: s.warnings.map((w) =>
            w.id === warningId
              ? {
                  ...w,
                  remarks: [
                    ...w.remarks,
                    { ...remark, id: uid(), createdAt: nowStr() },
                  ],
                }
              : w,
          ),
        })),

      updateStatus: (warningId, status, operator) =>
        set((s) => ({
          warnings: s.warnings.map((w) =>
            w.id === warningId
              ? {
                  ...w,
                  status,
                  operator: operator || w.operator,
                  confirmDate: status === 'confirmed' ? nowStr().slice(0, 10) : w.confirmDate,
                }
              : w,
          ),
        })),

      rerunWarnings: () => {
        const fresh = generateMockWarnings();
        const prev = get().warnings;
        const merged = fresh.map((f) => {
          const p = prev.find((x) => x.billNo === f.billNo);
          if (p) {
            return { ...f, id: p.id, status: p.status, remarks: p.remarks, operator: p.operator, confirmDate: p.confirmDate };
          }
          return f;
        });
        set({ warnings: merged });
      },

      loadSampleData: () => set({ warnings: generateMockWarnings(), sampleLoaded: true }),

      getFilteredWarnings: () => {
        const { warnings, filters, activeStatusTab } = get();
        return warnings.filter((w) => {
          if (activeStatusTab !== 'all' && w.status !== activeStatusTab) return false;
          if (filters.billNo && !w.billNo.toLowerCase().includes(filters.billNo.toLowerCase())) return false;
          if (filters.customerName && !w.customerName.includes(filters.customerName)) return false;
          if (filters.dateFrom && w.createDate < filters.dateFrom) return false;
          if (filters.dateTo && w.createDate > filters.dateTo) return false;
          if (filters.isNegativeCorrection !== undefined && filters.isNegativeCorrection !== null && w.isNegativeCorrection !== filters.isNegativeCorrection) return false;
          if (filters.riskLevel && w.riskLevel !== filters.riskLevel) return false;
          if (filters.status && w.status !== filters.status) return false;
          return true;
        });
      },

      getWarningById: (id) => get().warnings.find((w) => w.id === id),

      getStatusCounts: () => {
        const { warnings } = get();
        return {
          all: warnings.length,
          confirmed: warnings.filter((w) => w.status === 'confirmed').length,
          pending: warnings.filter((w) => w.status === 'pending').length,
          returned: warnings.filter((w) => w.status === 'returned').length,
        };
      },
    }),
    {
      name: 'bill-pool-warning-store',
      partialize: (state) => ({
        warnings: state.warnings,
        filters: state.filters,
        activeStatusTab: state.activeStatusTab,
        sampleLoaded: state.sampleLoaded,
      }),
    },
  ),
);
