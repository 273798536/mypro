import { create } from 'zustand';
import type { LoadingRecord, RecordStatus, ViewState, Position } from '../types';
import { mockRecords } from '../data/mockRecords';

interface AppState {
  records: LoadingRecord[];
  selectedRecordId: string;
  filterStatus: RecordStatus | 'all';
  savedViews: ViewState[];
  autoRotate: boolean;
  setSelectedRecord: (id: string) => void;
  setFilterStatus: (status: RecordStatus | 'all') => void;
  getSelectedRecord: () => LoadingRecord | undefined;
  getFilteredRecords: () => LoadingRecord[];
  saveView: (name: string, cameraPosition: Position, target: Position) => void;
  deleteView: (id: string) => void;
  toggleAutoRotate: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  records: mockRecords,
  selectedRecordId: 'rec-001',
  filterStatus: 'all',
  savedViews: [
    {
      id: 'view-default',
      name: '默认视角',
      cameraPosition: { x: 15, y: 10, z: 15 },
      target: { x: 0, y: 0, z: 0 },
    },
    {
      id: 'view-top',
      name: '俯视',
      cameraPosition: { x: 0, y: 25, z: 0.01 },
      target: { x: 0, y: 0, z: 0 },
    },
    {
      id: 'view-side',
      name: '侧视',
      cameraPosition: { x: 20, y: 5, z: 0 },
      target: { x: 0, y: 0, z: 0 },
    },
  ],
  autoRotate: false,

  setSelectedRecord: (id: string) => set({ selectedRecordId: id }),

  setFilterStatus: (status) => set({ filterStatus: status }),

  getSelectedRecord: () => {
    const { records, selectedRecordId } = get();
    return records.find((r) => r.id === selectedRecordId);
  },

  getFilteredRecords: () => {
    const { records, filterStatus } = get();
    if (filterStatus === 'all') return records;
    return records.filter((r) => r.status === filterStatus);
  },

  saveView: (name, cameraPosition, target) => {
    const newView: ViewState = {
      id: `view-${Date.now()}`,
      name,
      cameraPosition,
      target,
    };
    set((state) => ({
      savedViews: [...state.savedViews, newView],
    }));
  },

  deleteView: (id) => set((state) => ({
    savedViews: state.savedViews.filter((v) => v.id !== id),
  })),

  toggleAutoRotate: () => set((state) => ({
    autoRotate: !state.autoRotate,
  })),
}));
