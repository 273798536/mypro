import { create } from 'zustand';
import type {
  ChangeRecordListItem,
  FilterParams,
  RecordStatus,
  User,
} from '../../shared/types';

interface AppState {
  currentUser: (User & { roleDisplay: { name: string; color: string; description: string }; permissions: Array<{ resource: string; action: string; name: string; description: string; granted: boolean }> }) | null;
  changes: ChangeRecordListItem[];
  totalChanges: number;
  filters: FilterParams;
  page: number;
  pageSize: number;
  loading: boolean;
  selectedIds: string[];
  currentRole: 'admin' | 'bi_analyst' | 'dev';

  setCurrentUser: (user: AppState['currentUser']) => void;
  setChanges: (changes: ChangeRecordListItem[], total: number) => void;
  setFilters: (filters: Partial<FilterParams>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setLoading: (loading: boolean) => void;
  toggleSelected: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelected: () => void;
  setCurrentRole: (role: AppState['currentRole']) => void;
  updateChangeStatus: (id: string, status: RecordStatus) => void;
  bulkUpdateStatus: (ids: string[], status: RecordStatus) => void;
}

export const useStore = create<AppState>((set) => ({
  currentUser: null,
  changes: [],
  totalChanges: 0,
  filters: {},
  page: 1,
  pageSize: 20,
  loading: false,
  selectedIds: [],
  currentRole: 'bi_analyst',

  setCurrentUser: (user) => set({ currentUser: user }),
  setChanges: (changes, total) => set({ changes, totalChanges: total }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters }, page: 1 })),
  resetFilters: () => set({ filters: {}, page: 1 }),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  setLoading: (loading) => set({ loading }),
  toggleSelected: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((i) => i !== id)
        : [...state.selectedIds, id],
    })),
  selectAll: (ids) => set({ selectedIds: ids }),
  clearSelected: () => set({ selectedIds: [] }),
  setCurrentRole: (role) => {
    localStorage.setItem('userId', role === 'admin' ? 'user_1' : role === 'bi_analyst' ? 'user_2' : 'user_3');
    set({ currentRole: role });
  },
  updateChangeStatus: (id, status) =>
    set((state) => ({
      changes: state.changes.map((c) => (c.id === id ? { ...c, status } : c)),
    })),
  bulkUpdateStatus: (ids, status) =>
    set((state) => ({
      changes: state.changes.map((c) => (ids.includes(c.id) ? { ...c, status } : c)),
      selectedIds: [],
    })),
}));
