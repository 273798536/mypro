import { create } from 'zustand';
import type { RecordStatus, UiState } from '@/types';

export const useUiStore = create<UiState & {
  setRole: (role: UiState['currentRole']) => void;
  toggleSidebar: () => void;
  setSearchQuery: (q: string) => void;
  setFilterStatus: (s: RecordStatus | 'all') => void;
  setDateRange: (r: UiState['dateRange']) => void;
}>((set) => ({
  currentRole: 'safety_officer',
  sidebarCollapsed: false,
  searchQuery: '',
  filterStatus: 'all',
  dateRange: null,
  setRole: (role) => set({ currentRole: role }),
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setFilterStatus: (s) => set({ filterStatus: s }),
  setDateRange: (r) => set({ dateRange: r }),
}));

export default useUiStore;
