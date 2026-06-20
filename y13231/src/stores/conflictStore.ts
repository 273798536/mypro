import { create } from 'zustand';
import type { ConflictRecord, ConflictFilters, ConflictStatus, ContractScan, NoteChange } from '@/types';
import { createHistoryVersion, generateId } from '@/utils/history';
import { saveToIndexedDB, loadFromIndexedDB, saveFilters, loadFilters } from '@/utils/storage';
import { recordsToCSV, downloadCSV, parseCSV } from '@/utils/csv';
import { generateMockData } from '@/utils/mock';

interface ConflictState {
  records: ConflictRecord[];
  filters: ConflictFilters;
  currentRecord: ConflictRecord | null;
  isLoading: boolean;
  currentOperator: string;
  
  loadRecords: () => Promise<void>;
  saveRecord: (record: Omit<ConflictRecord, 'id' | 'contractScans' | 'historyVersions' | 'noteChanges' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateNote: (id: string, newNote: string) => Promise<void>;
  addContractScan: (id: string, scan: Omit<ContractScan, 'id' | 'version' | 'createdAt'>) => Promise<void>;
  updateStatus: (id: string, status: ConflictStatus) => Promise<void>;
  toggleTimecodeOffset: (id: string) => Promise<void>;
  setCurrentRecord: (record: ConflictRecord | null) => void;
  setFilters: (filters: Partial<ConflictFilters>) => void;
  getFilteredRecords: () => ConflictRecord[];
  exportCSV: () => void;
  importCSV: (csvData: string) => Promise<void>;
  getRecordById: (id: string) => ConflictRecord | undefined;
  addNoteChange: (id: string, noteChange: Omit<NoteChange, 'id'>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
}

export const useConflictStore = create<ConflictState>((set, get) => ({
  records: [],
  filters: {},
  currentRecord: null,
  isLoading: false,
  currentOperator: '排班同事',

  loadRecords: async () => {
    set({ isLoading: true });
    try {
      let records = await loadFromIndexedDB();
      
      if (records.length === 0) {
        records = generateMockData();
        await saveToIndexedDB(records);
      }
      
      const savedFilters = loadFilters();
      if (savedFilters) {
        set({ filters: savedFilters as ConflictFilters });
      }
      
      set({ records, isLoading: false });
    } catch (error) {
      console.error('Failed to load records:', error);
      set({ isLoading: false });
    }
  },

  saveRecord: async (recordData) => {
    const now = new Date().toISOString();
    const id = generateId();
    const { currentOperator } = get();
    
    const newRecord: ConflictRecord = {
      ...recordData,
      id,
      contractScans: [],
      historyVersions: [],
      noteChanges: [],
      createdAt: now,
      updatedAt: now,
    };

    const historyVersion = createHistoryVersion(
      newRecord,
      'create',
      currentOperator,
      { trackName: newRecord.trackName, fileName: newRecord.fileName }
    );
    newRecord.historyVersions.push(historyVersion);

    set((state) => {
      const records = [...state.records, newRecord];
      saveToIndexedDB(records);
      return { records };
    });
  },

  updateNote: async (id: string, newNote: string) => {
    const { currentOperator, records } = get();
    const record = records.find(r => r.id === id);
    if (!record) return;

    const oldNote = record.currentNote;
    if (oldNote === newNote) return;

    const updatedRecord: ConflictRecord = {
      ...record,
      currentNote: newNote,
      updatedAt: new Date().toISOString(),
    };

    const noteChange: NoteChange = {
      id: generateId(),
      conflictId: id,
      oldNote,
      newNote,
      operator: currentOperator,
      createdAt: new Date().toISOString(),
    };
    updatedRecord.noteChanges.push(noteChange);

    const historyVersion = createHistoryVersion(
      updatedRecord,
      'note_change',
      currentOperator,
      { currentNote: newNote }
    );
    updatedRecord.historyVersions.push(historyVersion);

    set((state) => {
      const newRecords = state.records.map(r => r.id === id ? updatedRecord : r);
      saveToIndexedDB(newRecords);
      return {
        records: newRecords,
        currentRecord: state.currentRecord?.id === id ? updatedRecord : state.currentRecord,
      };
    });
  },

  addContractScan: async (id: string, scanData) => {
    const { currentOperator, records } = get();
    const record = records.find(r => r.id === id);
    if (!record) return;

    const newScan: ContractScan = {
      ...scanData,
      id: generateId(),
      version: record.contractScans.length + 1,
      createdAt: new Date().toISOString(),
    };

    const updatedRecord: ConflictRecord = {
      ...record,
      contractScans: [...record.contractScans, newScan],
      updatedAt: new Date().toISOString(),
    };

    const historyVersion = createHistoryVersion(
      updatedRecord,
      'scan_add',
      currentOperator,
      { contractScans: updatedRecord.contractScans }
    );
    updatedRecord.historyVersions.push(historyVersion);

    set((state) => {
      const newRecords = state.records.map(r => r.id === id ? updatedRecord : r);
      saveToIndexedDB(newRecords);
      return {
        records: newRecords,
        currentRecord: state.currentRecord?.id === id ? updatedRecord : state.currentRecord,
      };
    });
  },

  updateStatus: async (id: string, status: ConflictStatus) => {
    const { currentOperator, records } = get();
    const record = records.find(r => r.id === id);
    if (!record || record.status === status) return;

    const updatedRecord: ConflictRecord = {
      ...record,
      status,
      updatedAt: new Date().toISOString(),
    };

    const historyVersion = createHistoryVersion(
      updatedRecord,
      'status_change',
      currentOperator,
      { status }
    );
    updatedRecord.historyVersions.push(historyVersion);

    set((state) => {
      const newRecords = state.records.map(r => r.id === id ? updatedRecord : r);
      saveToIndexedDB(newRecords);
      return {
        records: newRecords,
        currentRecord: state.currentRecord?.id === id ? updatedRecord : state.currentRecord,
      };
    });
  },

  toggleTimecodeOffset: async (id: string) => {
    const { currentOperator, records } = get();
    const record = records.find(r => r.id === id);
    if (!record) return;

    const newValue = !record.isTimecodeOffset;

    const updatedRecord: ConflictRecord = {
      ...record,
      isTimecodeOffset: newValue,
      updatedAt: new Date().toISOString(),
    };

    const historyVersion = createHistoryVersion(
      updatedRecord,
      'timecode_toggle',
      currentOperator,
      { isTimecodeOffset: newValue }
    );
    updatedRecord.historyVersions.push(historyVersion);

    set((state) => {
      const newRecords = state.records.map(r => r.id === id ? updatedRecord : r);
      saveToIndexedDB(newRecords);
      return {
        records: newRecords,
        currentRecord: state.currentRecord?.id === id ? updatedRecord : state.currentRecord,
      };
    });
  },

  setCurrentRecord: (record) => set({ currentRecord: record }),

  setFilters: (newFilters) => {
    const filters = { ...get().filters, ...newFilters };
    saveFilters(filters);
    set({ filters });
  },

  getFilteredRecords: () => {
    const { records, filters } = get();
    
    return records.filter(record => {
      if (filters.status && record.status !== filters.status) return false;
      if (filters.isTimecodeOffset !== undefined && record.isTimecodeOffset !== filters.isTimecodeOffset) return false;
      
      if (filters.keyword) {
        const keyword = filters.keyword.toLowerCase();
        return (
          record.trackName.toLowerCase().includes(keyword) ||
          record.fileName.toLowerCase().includes(keyword) ||
          record.currentNote.toLowerCase().includes(keyword)
        );
      }
      
      if (filters.dateRange) {
        const [start, end] = filters.dateRange;
        const recordDate = new Date(record.updatedAt);
        return recordDate >= new Date(start) && recordDate <= new Date(end);
      }
      
      return true;
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  exportCSV: () => {
    const filteredRecords = get().getFilteredRecords();
    const csvContent = recordsToCSV(filteredRecords);
    const filename = `采样包素材排期冲突_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvContent, filename);
  },

  importCSV: async (csvData: string) => {
    const parsed = parseCSV(csvData);
    const { currentOperator } = get();
    
    for (const data of parsed) {
      if (data.trackName && data.fileName) {
        const now = new Date().toISOString();
        const id = generateId();
        
        const newRecord: ConflictRecord = {
          id,
          trackName: data.trackName,
          fileName: data.fileName,
          status: data.status || 'pending',
          isTimecodeOffset: data.isTimecodeOffset || false,
          currentNote: data.currentNote || '',
          contractScans: [],
          historyVersions: [],
          noteChanges: [],
          createdAt: now,
          updatedAt: now,
        };

        const historyVersion = createHistoryVersion(
          newRecord,
          'create',
          currentOperator,
          { trackName: newRecord.trackName, fileName: newRecord.fileName }
        );
        newRecord.historyVersions.push(historyVersion);

        set((state) => {
          const records = [...state.records, newRecord];
          saveToIndexedDB(records);
          return { records };
        });
      }
    }
  },

  getRecordById: (id: string) => get().records.find(r => r.id === id),

  addNoteChange: async (id: string, noteChangeData) => {
    const { currentOperator, records } = get();
    const record = records.find(r => r.id === id);
    if (!record) return;

    const noteChange: NoteChange = {
      ...noteChangeData,
      id: generateId(),
      operator: currentOperator,
      createdAt: new Date().toISOString(),
    };

    const updatedRecord: ConflictRecord = {
      ...record,
      noteChanges: [...record.noteChanges, noteChange],
      updatedAt: new Date().toISOString(),
    };

    set((state) => {
      const newRecords = state.records.map(r => r.id === id ? updatedRecord : r);
      saveToIndexedDB(newRecords);
      return {
        records: newRecords,
        currentRecord: state.currentRecord?.id === id ? updatedRecord : state.currentRecord,
      };
    });
  },

  deleteRecord: async (id: string) => {
    set((state) => {
      const records = state.records.filter(r => r.id !== id);
      saveToIndexedDB(records);
      return {
        records,
        currentRecord: state.currentRecord?.id === id ? null : state.currentRecord,
      };
    });
  },
}));
