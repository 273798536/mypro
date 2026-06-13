import { create } from 'zustand';
import type { NameplateRecord, TorqueCalcResult, DataBatch } from '@/types';
import { batchCalculate } from '@/utils/torqueCalculator';
import { addBatch as storeAddBatch, clearAllData, loadRecords, loadBatches, deleteBatch as storeDeleteBatch } from '@/utils/dataStore';
import { sampleRecords, sampleBatches } from '@/data/sampleData';
import { parseExcelFile } from '@/utils/excelExporter';

interface TorqueState {
  records: NameplateRecord[];
  batches: DataBatch[];
  results: TorqueCalcResult[];
  selectedRecordId: string | null;
  isLoaded: boolean;

  loadFromStorage: () => void;
  loadSampleData: () => void;
  addBatchFromFile: (file: File, note?: string) => Promise<void>;
  addBatchFromRecords: (records: NameplateRecord[], fileName: string, note?: string) => void;
  deleteBatch: (batchId: string) => void;
  clearAll: () => void;
  selectRecord: (id: string | null) => void;
  recalculate: () => void;
}

export const useTorqueStore = create<TorqueState>((set, get) => ({
  records: [],
  batches: [],
  results: [],
  selectedRecordId: null,
  isLoaded: false,

  loadFromStorage: () => {
    const records = loadRecords();
    const batches = loadBatches();
    const results = batchCalculate(records);
    set({ records, batches, results, isLoaded: true });
  },

  loadSampleData: () => {
    const results = batchCalculate(sampleRecords);
    set({
      records: sampleRecords,
      batches: sampleBatches,
      results,
      isLoaded: true,
    });
  },

  addBatchFromFile: async (file: File, note?: string) => {
    const records = await parseExcelFile(file);
    get().addBatchFromRecords(records, file.name, note);
  },

  addBatchFromRecords: (records: NameplateRecord[], fileName: string, note?: string) => {
    const { allRecords, allBatches } = storeAddBatch(records, { fileName, note });
    const results = batchCalculate(allRecords);
    set({ records: allRecords, batches: allBatches, results });
  },

  deleteBatch: (batchId: string) => {
    const { allRecords, allBatches } = storeDeleteBatch(batchId);
    const results = batchCalculate(allRecords);
    const { selectedRecordId } = get();
    const stillExists = allRecords.some(r => r.id === selectedRecordId);
    set({
      records: allRecords,
      batches: allBatches,
      results,
      selectedRecordId: stillExists ? selectedRecordId : null,
    });
  },

  clearAll: () => {
    clearAllData();
    set({ records: [], batches: [], results: [], selectedRecordId: null });
  },

  selectRecord: (id: string | null) => {
    set({ selectedRecordId: id });
  },

  recalculate: () => {
    const { records } = get();
    const results = batchCalculate(records);
    set({ results });
  },
}));
