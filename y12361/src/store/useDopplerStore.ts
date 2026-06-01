import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DopplerRecord, CalculationStatus, CalculationMode, ExportOptions } from '../types/doppler';
import {
  createEmptyRecord,
  updateRecordCalculations,
  addCalculationLog,
  generateFingerprint,
  exportToCSV,
  exportToJSON,
  parseCSV
} from '../utils/dopplerEngine';

interface DopplerState {
  records: DopplerRecord[];
  currentRecordId: string | null;
  filters: {
    status: CalculationStatus[];
    dateRange: [number, number] | null;
  };
  calculationMode: CalculationMode;

  createRecord: (source?: 'manual' | 'import' | 'demo', sourceNote?: string) => DopplerRecord;
  updateRecord: (id: string, updates: Partial<DopplerRecord>) => void;
  deleteRecord: (id: string) => void;
  setCurrentRecord: (id: string | null) => void;
  batchImport: (data: Partial<DopplerRecord>[]) => void;
  recalculateAll: () => void;
  setCalculationMode: (mode: CalculationMode) => void;
  recalculateRecord: (id: string, mode?: CalculationMode) => void;
  setFilters: (filters: Partial<DopplerState['filters']>) => void;
  exportRecords: (options: ExportOptions) => string;
  importFromCSV: (csvText: string) => number;
  clearAllRecords: () => void;
  getFilteredRecords: () => DopplerRecord[];
  getRecordById: (id: string) => DopplerRecord | undefined;
  isDuplicate: (fingerprint: string) => boolean;
}

const STORAGE_KEY = 'doppler-teaching-aid:v1';

export const useDopplerStore = create<DopplerState>()(
  persist(
    (set, get) => ({
      records: [],
      currentRecordId: null,
      filters: {
        status: [],
        dateRange: null
      },
      calculationMode: 'frequency_to_velocity',

      createRecord: (source = 'manual', sourceNote) => {
        const newRecord = createEmptyRecord(source, sourceNote);
        set((state) => ({
          records: [...state.records, newRecord],
          currentRecordId: newRecord.id
        }));
        return newRecord;
      },

      updateRecord: (id, updates) => {
        set((state) => {
          const records = state.records.map(record => {
            if (record.id !== id) return record;
            const updatedRecord = { ...record, ...updates };
            
            const keys = Object.keys(updates) as (keyof DopplerRecord)[];
            let withLog = updatedRecord;
            keys.forEach(key => {
              withLog = addCalculationLog(withLog, key, record[key], updates[key]);
            });
            
            return withLog;
          });
          
          return { records };
        });
      },

      deleteRecord: (id) => {
        set((state) => ({
          records: state.records.filter(r => r.id !== id),
          currentRecordId: state.currentRecordId === id ? null : state.currentRecordId
        }));
      },

      setCurrentRecord: (id) => {
        set({ currentRecordId: id });
      },

      batchImport: (data) => {
        const newRecords = data.map(partial => {
          const base = createEmptyRecord('import', partial.sourceNote);
          return updateRecordCalculations({
            ...base,
            ...partial
          });
        }).filter(r => !get().isDuplicate(r.fingerprint));
        
        set((state) => ({
          records: [...state.records, ...newRecords]
        }));
      },

      recalculateAll: () => {
        const mode = get().calculationMode;
        set((state) => ({
          records: state.records.map(r => updateRecordCalculations(r, mode))
        }));
      },

      setCalculationMode: (mode) => {
        set({ calculationMode: mode });
      },

      recalculateRecord: (id, mode) => {
        const actualMode = mode || get().calculationMode;
        set((state) => ({
          records: state.records.map(r =>
            r.id === id ? updateRecordCalculations(r, actualMode) : r
          )
        }));
      },

      setFilters: (filters) => {
        set((state) => ({
          filters: { ...state.filters, ...filters }
        }));
      },

      exportRecords: (options) => {
        let records = get().records;
        
        if (!options.includeIncomplete === false) {
          records = records.filter(r => r.status !== 'incomplete');
        }
        
        if (options.format === 'csv') {
          return exportToCSV(records);
        }
        return exportToJSON(records);
      },

      importFromCSV: (csvText) => {
        const parsed = parseCSV(csvText);
        get().batchImport(parsed);
        return parsed.length;
      },

      clearAllRecords: () => {
        set({ records: [], currentRecordId: null });
      },

      getFilteredRecords: () => {
        const { records, filters } = get();
        return records.filter(record => {
          if (filters.status.length > 0 && !filters.status.includes(record.status)) {
            return false;
          }
          if (filters.dateRange) {
            const [start, end] = filters.dateRange;
            if (record.createdAt < start || record.createdAt > end) {
              return false;
            }
          }
          return true;
        });
      },

      getRecordById: (id) => {
        return get().records.find(r => r.id === id);
      },

      isDuplicate: (fingerprint) => {
        return get().records.some(r => r.fingerprint === fingerprint);
      }
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      migrate: (persistedState: unknown, version) => {
        if (version === 0) {
          return persistedState as Partial<DopplerState>;
        }
        return persistedState as Partial<DopplerState>;
      }
    }
  )
);
