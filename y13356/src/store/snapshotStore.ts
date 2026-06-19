import { create } from 'zustand';
import type { Snapshot, Note, Judgment, FilterState } from '@/types';
import { snapshots as initialSnapshots } from '@/data/snapshots';
import { snapshotNotes, snapshotJudgments } from '@/data/steps';

interface SnapshotStore {
  snapshots: Snapshot[];
  notes: Record<string, Note[]>;
  judgments: Record<string, Judgment[]>;
  filters: FilterState;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  addNote: (snapshotId: string, note: Omit<Note, 'id' | 'createdAt'>) => void;
  setJudgment: (snapshotId: string, judgment: Omit<Judgment, 'id' | 'judgedAt'>) => void;
  toggleGrayError: (snapshotId: string) => void;
  getFilteredSnapshots: () => Snapshot[];
}

const initialFilters: FilterState = {
  status: 'all',
  hasGrayError: 'all',
  modelVersion: '',
  searchKeyword: '',
  dateRange: null,
};

export const useSnapshotStore = create<SnapshotStore>((set, get) => ({
  snapshots: initialSnapshots,
  notes: snapshotNotes,
  judgments: snapshotJudgments,
  filters: initialFilters,
  
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },
  
  resetFilters: () => {
    set({ filters: initialFilters });
  },
  
  addNote: (snapshotId, noteData) => {
    set((state) => {
      const newNote: Note = {
        ...noteData,
        id: `note-${Date.now()}`,
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      };
      const currentNotes = state.notes[snapshotId] || [];
      return {
        notes: {
          ...state.notes,
          [snapshotId]: [...currentNotes, newNote],
        },
      };
    });
  },
  
  setJudgment: (snapshotId, judgmentData) => {
    set((state) => {
      const newJudgment: Judgment = {
        ...judgmentData,
        id: `judge-${Date.now()}`,
        judgedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      };
      return {
        judgments: {
          ...state.judgments,
          [snapshotId]: [newJudgment],
        },
      };
    });
  },
  
  toggleGrayError: (snapshotId) => {
    set((state) => ({
      snapshots: state.snapshots.map((snap) => {
        if (snap.id === snapshotId) {
          const hasGrayError = !snap.hasGrayError;
          return {
            ...snap,
            hasGrayError,
            status: hasGrayError ? 'gray_error' : (snap.status === 'gray_error' ? 'pending' : snap.status),
          };
        }
        return snap;
      }),
    }));
  },
  
  getFilteredSnapshots: () => {
    const { snapshots, filters } = get();
    return snapshots.filter((snap) => {
      if (filters.status !== 'all' && snap.status !== filters.status) {
        return false;
      }
      if (filters.hasGrayError !== 'all' && snap.hasGrayError !== filters.hasGrayError) {
        return false;
      }
      if (filters.modelVersion && snap.modelVersion !== filters.modelVersion) {
        return false;
      }
      if (filters.searchKeyword) {
        const keyword = filters.searchKeyword.toLowerCase();
        if (
          !snap.name.toLowerCase().includes(keyword) &&
          !snap.remark.toLowerCase().includes(keyword) &&
          !snap.createdBy.toLowerCase().includes(keyword)
        ) {
          return false;
        }
      }
      return true;
    });
  },
}));
