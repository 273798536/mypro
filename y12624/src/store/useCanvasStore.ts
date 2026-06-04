import { create } from 'zustand';
import { ArrowRecord, FilterConfig, CanvasStore, RecordStatus } from '@/types';
import { mockArrowRecords } from '@/data/mockData';
import { generateReport } from '@/utils/report';

const MAX_HISTORY = 50;

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  records: mockArrowRecords,
  selectedId: null,
  filter: {
    status: [],
    timeRange: null,
  },
  past: [],
  future: [],

  selectRecord: (id) => set({ selectedId: id }),

  updateRecord: (id, updates) => {
    const { records, past } = get();
    
    set({
      past: [...past.slice(-MAX_HISTORY + 1), records],
      future: [],
      records: records.map(r => 
        r.id === id ? { ...r, ...updates } : r
      ),
    });
  },

  addRecord: (record) => {
    const { records, past } = get();
    
    set({
      past: [...past.slice(-MAX_HISTORY + 1), records],
      future: [],
      records: [...records, record],
    });
  },

  deleteRecord: (id) => {
    const { records, past, selectedId } = get();
    
    set({
      past: [...past.slice(-MAX_HISTORY + 1), records],
      future: [],
      records: records.filter(r => r.id !== id),
      selectedId: selectedId === id ? null : selectedId,
    });
  },

  addRemark: (id, remark) => {
    const { records, past } = get();
    
    set({
      past: [...past.slice(-MAX_HISTORY + 1), records],
      future: [],
      records: records.map(r => 
        r.id === id ? { ...r, remark, isManualRemark: true } : r
      ),
    });
  },

  undo: () => {
    const { past, future, records } = get();
    if (past.length === 0) return;

    const newPast = [...past];
    const previous = newPast.pop()!;

    set({
      past: newPast,
      future: [records, ...future],
      records: previous,
    });
  },

  redo: () => {
    const { past, future, records } = get();
    if (future.length === 0) return;

    const newFuture = [...future];
    const next = newFuture.shift()!;

    set({
      past: [...past, records],
      future: newFuture,
      records: next,
    });
  },

  get canUndo() {
    return get().past.length > 0;
  },

  get canRedo() {
    return get().future.length > 0;
  },

  setFilter: (newFilter) => {
    set((state) => ({
      filter: { ...state.filter, ...newFilter },
    }));
  },

  get filteredRecords() {
    const { records, filter } = get();
    
    return records.filter((record) => {
      if (filter.status.length > 0 && !filter.status.includes(record.status as RecordStatus)) {
        return false;
      }
      
      if (filter.timeRange) {
        const [start, end] = filter.timeRange;
        if (record.timestamp < start || record.timestamp > end) {
          return false;
        }
      }
      
      return true;
    });
  },

  generateReport: () => {
    const { records } = get();
    return generateReport(records);
  },
}));
