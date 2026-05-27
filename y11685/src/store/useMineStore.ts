import { create } from 'zustand';
import { DrillRecord, SelectedObject } from '@/types';
import { MOCK_RECORDS } from '@/data/mockRecords';

interface MineState {
  records: DrillRecord[];
  selectedRecordId: string;
  selectedObject: SelectedObject | null;
  isPlaying: boolean;
  showSmoke: boolean;
  showRoute: boolean;
  showDoors: boolean;
  showPersons: boolean;
  filterStatus: 'all' | 'normal' | 'warning' | 'error';

  setSelectedRecordId: (id: string) => void;
  setSelectedObject: (obj: SelectedObject | null) => void;
  togglePlaying: () => void;
  toggleSmoke: () => void;
  toggleRoute: () => void;
  toggleDoors: () => void;
  togglePersons: () => void;
  setFilterStatus: (status: 'all' | 'normal' | 'warning' | 'error') => void;
  getSelectedRecord: () => DrillRecord | undefined;
  getFilteredRecords: () => DrillRecord[];
}

export const useMineStore = create<MineState>((set, get) => ({
  records: MOCK_RECORDS,
  selectedRecordId: MOCK_RECORDS[0]?.id || '',
  selectedObject: null,
  isPlaying: true,
  showSmoke: true,
  showRoute: true,
  showDoors: true,
  showPersons: true,
  filterStatus: 'all',

  setSelectedRecordId: (id) => set({ selectedRecordId: id, selectedObject: null }),
  setSelectedObject: (obj) => set({ selectedObject: obj }),
  togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
  toggleSmoke: () => set((state) => ({ showSmoke: !state.showSmoke })),
  toggleRoute: () => set((state) => ({ showRoute: !state.showRoute })),
  toggleDoors: () => set((state) => ({ showDoors: !state.showDoors })),
  togglePersons: () => set((state) => ({ showPersons: !state.showPersons })),
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
}));
