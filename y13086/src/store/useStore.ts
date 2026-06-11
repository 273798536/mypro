import { create } from 'zustand'
import type { MuseumRecord, RecordDetail, UserRole, ViewMode } from '@/types'

interface Filters {
  floor: string;
  cabinetNo: string;
  anomalyType: string;
  status: string;
  startDate: string;
  endDate: string;
}

interface AppState {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;
  selectedRecordId: string | null;
  setSelectedRecordId: (id: string | null) => void;
  records: MuseumRecord[];
  setRecords: (records: MuseumRecord[]) => void;
  recordDetail: RecordDetail | null;
  setRecordDetail: (detail: RecordDetail | null) => void;
  filters: Filters;
  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  rejudgeModalOpen: boolean;
  setRejudgeModalOpen: (open: boolean) => void;
}

const defaultFilters: Filters = {
  floor: '',
  cabinetNo: '',
  anomalyType: '',
  status: '',
  startDate: '',
  endDate: '',
}

export const useStore = create<AppState>((set) => ({
  userRole: 'inspector',
  setUserRole: (role) => set({ userRole: role }),
  currentView: 'anomaly_first',
  setCurrentView: (view) => set({ currentView: view }),
  selectedRecordId: null,
  setSelectedRecordId: (id) => set({ selectedRecordId: id }),
  records: [],
  setRecords: (records) => set({ records }),
  recordDetail: null,
  setRecordDetail: (detail) => set({ recordDetail: detail }),
  filters: { ...defaultFilters },
  setFilters: (partial) => set((state) => ({ filters: { ...state.filters, ...partial } })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  rejudgeModalOpen: false,
  setRejudgeModalOpen: (open) => set({ rejudgeModalOpen: open }),
}))
