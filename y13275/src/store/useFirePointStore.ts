import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FirePoint, DataSource, ChangeRecord, DataSourceType, SyncStatus, ChangeField } from '@/types';
import { mockPoints, mockDataSources, mockChangeHistory } from '@/data/mockData';

interface FirePointState {
  points: FirePoint[];
  dataSources: DataSource[];
  changeHistory: ChangeRecord[];
  selectedPointId: string | null;
  activeDataSourceTab: DataSourceType;
  expandedAbnormal: string[];
  syncStatus: SyncStatus;
  lastSavedTime: string | null;
  searchQuery: string;
  statusFilter: 'all' | 'pending' | 'merged' | 'abnormal';
}

interface FirePointActions {
  setSelectedPointId: (id: string | null) => void;
  setActiveDataSourceTab: (tab: DataSourceType) => void;
  toggleAbnormalExpanded: (id: string) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: 'all' | 'pending' | 'merged' | 'abnormal') => void;
  updatePoint: (id: string, data: Partial<FirePoint>) => Promise<void>;
  confirmChange: (recordId: string) => void;
  toggleAffectsConclusion: (sourceId: string) => void;
  getSelectedPoint: () => FirePoint | undefined;
  getPointDataSources: (pointId: string) => DataSource[];
  getPointChangeHistory: (pointId: string) => ChangeRecord[];
  getFilteredPoints: () => FirePoint[];
  addChangeRecord: (pointId: string, field: ChangeField, oldValue: string, newValue: string) => void;
  resetAllData: () => void;
}

const generateId = (prefix: string) => `${prefix}${Date.now().toString(36).toUpperCase()}`;

export const useFirePointStore = create<FirePointState & FirePointActions>()(
  persist(
    (set, get) => ({
      points: mockPoints,
      dataSources: mockDataSources,
      changeHistory: mockChangeHistory,
      selectedPointId: 'FP001',
      activeDataSourceTab: 'meeting_minutes',
      expandedAbnormal: [],
      syncStatus: 'idle',
      lastSavedTime: null,
      searchQuery: '',
      statusFilter: 'all',

      setSelectedPointId: (id) => set({ selectedPointId: id }),
      setActiveDataSourceTab: (tab) => set({ activeDataSourceTab: tab }),
      toggleAbnormalExpanded: (id) =>
        set((state) => ({
          expandedAbnormal: state.expandedAbnormal.includes(id)
            ? state.expandedAbnormal.filter((x) => x !== id)
            : [...state.expandedAbnormal, id],
        })),
      setSyncStatus: (status) => set({ syncStatus: status }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setStatusFilter: (filter) => set({ statusFilter: filter }),

      updatePoint: async (id, data) => {
        set({ syncStatus: 'saving' });
        await new Promise((resolve) => setTimeout(resolve, 800));

        const state = get();
        const point = state.points.find((p) => p.id === id);
        if (!point) {
          set({ syncStatus: 'error' });
          return;
        }

        const now = new Date().toISOString();
        const updatedPoints = state.points.map((p) =>
          p.id === id ? { ...p, ...data, updatedAt: now } : p
        );

        Object.entries(data).forEach(([field, value]) => {
          const oldValue = point[field as keyof FirePoint];
          if (typeof oldValue === 'string' && oldValue !== value) {
            const newRecord: ChangeRecord = {
              id: generateId('CR'),
              pointId: id,
              field: field as ChangeField,
              oldValue,
              newValue: value as string,
              operator: '运营主管',
              operatedAt: now,
              confirmed: false,
            };
            set((s) => ({ changeHistory: [newRecord, ...s.changeHistory] }));
          }
        });

        set({
          points: updatedPoints,
          syncStatus: 'synced',
          lastSavedTime: now,
        });

        setTimeout(() => set({ syncStatus: 'idle' }), 2000);
      },

      confirmChange: (recordId) =>
        set((state) => ({
          changeHistory: state.changeHistory.map((r) =>
            r.id === recordId ? { ...r, confirmed: true } : r
          ),
        })),

      toggleAffectsConclusion: (sourceId) =>
        set((state) => ({
          dataSources: state.dataSources.map((s) =>
            s.id === sourceId ? { ...s, affectsConclusion: !s.affectsConclusion } : s
          ),
        })),

      getSelectedPoint: () => {
        const state = get();
        return state.points.find((p) => p.id === state.selectedPointId);
      },

      getPointDataSources: (pointId) => {
        const state = get();
        return state.dataSources.filter((s) => s.pointId === pointId);
      },

      getPointChangeHistory: (pointId) => {
        const state = get();
        return state.changeHistory
          .filter((r) => r.pointId === pointId)
          .sort((a, b) => new Date(b.operatedAt).getTime() - new Date(a.operatedAt).getTime());
      },

      getFilteredPoints: () => {
        const state = get();
        let filtered = [...state.points];

        if (state.searchQuery) {
          const query = state.searchQuery.toLowerCase();
          filtered = filtered.filter(
            (p) =>
              p.name.toLowerCase().includes(query) ||
              p.address.toLowerCase().includes(query) ||
              p.id.toLowerCase().includes(query)
          );
        }

        if (state.statusFilter !== 'all') {
          filtered = filtered.filter((p) => p.status === state.statusFilter);
        }

        return filtered.sort((a, b) => {
          const statusOrder = { abnormal: 0, pending: 1, merged: 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        });
      },

      addChangeRecord: (pointId, field, oldValue, newValue) => {
        const newRecord: ChangeRecord = {
          id: generateId('CR'),
          pointId,
          field,
          oldValue,
          newValue,
          operator: '运营主管',
          operatedAt: new Date().toISOString(),
          confirmed: false,
        };
        set((state) => ({ changeHistory: [newRecord, ...state.changeHistory] }));
      },

      resetAllData: () => {
        set({
          points: mockPoints,
          dataSources: mockDataSources,
          changeHistory: mockChangeHistory,
          selectedPointId: 'FP001',
          syncStatus: 'idle',
          lastSavedTime: null,
        });
      },
    }),
    {
      name: 'fire-point-storage',
      partialize: (state) => ({
        points: state.points,
        dataSources: state.dataSources,
        changeHistory: state.changeHistory,
        lastSavedTime: state.lastSavedTime,
      }),
    }
  )
);
