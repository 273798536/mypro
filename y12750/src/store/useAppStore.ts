import { create } from 'zustand';
import type { UserRole, FilterStatus, TitrationRecord, Annotation } from '../types';
import { mockRecords } from '../data/mockRecords';

interface AppState {
  currentRole: UserRole;
  filterStatus: FilterStatus;
  records: TitrationRecord[];
  highlightedRefId: string | null;
  setCurrentRole: (role: UserRole) => void;
  setFilterStatus: (status: FilterStatus) => void;
  getRecordById: (id: string) => TitrationRecord | undefined;
  getFilteredRecords: () => TitrationRecord[];
  getCounts: () => { all: number; passed: number; pending: number; error: number };
  addAnnotation: (recordId: string, annotation: Omit<Annotation, 'id' | 'time'>) => void;
  setHighlightedRefId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentRole: 'monitor',
  filterStatus: 'all',
  records: mockRecords,
  highlightedRefId: null,

  setCurrentRole: (role) => set({ currentRole: role }),
  setFilterStatus: (status) => set({ filterStatus: status }),

  getRecordById: (id) => get().records.find((r) => r.id === id),

  getFilteredRecords: () => {
    const { records, filterStatus } = get();
    if (filterStatus === 'all') return records;
    return records.filter((r) => r.status === filterStatus);
  },

  getCounts: () => {
    const { records } = get();
    return {
      all: records.length,
      passed: records.filter((r) => r.status === 'passed').length,
      pending: records.filter((r) => r.status === 'pending').length,
      error: records.filter((r) => r.status === 'error').length,
    };
  },

  addAnnotation: (recordId, annotation) => {
    set((state) => ({
      records: state.records.map((r) =>
        r.id === recordId
          ? {
              ...r,
              annotations: [
                ...r.annotations,
                {
                  ...annotation,
                  id: `ann-${Date.now()}`,
                  time: new Date().toLocaleString('zh-CN'),
                },
              ],
            }
          : r
      ),
    }));
  },

  setHighlightedRefId: (id) => set({ highlightedRefId: id }),
}));
