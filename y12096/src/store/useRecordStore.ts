import { create } from 'zustand';
import type { CalculationRecord, RecordFilter, ModificationEntry } from '../types/records';
import type { ParamState } from '../types/params';
import type { CalculationResult } from '../types/params';

interface RecordStore {
  records: CalculationRecord[];
  activeRecordId: string | null;
  filter: RecordFilter;
  pendingModifications: ModificationEntry[];

  createRecord: (params: ParamState, result: CalculationResult) => string;
  updateRecord: (id: string, changes: Partial<ParamState>, result: CalculationResult) => void;
  loadRecord: (id: string) => ParamState | null;
  deleteRecord: (id: string) => void;
  setFilter: (key: keyof RecordFilter, value: unknown) => void;
  getFilteredRecords: () => CalculationRecord[];
  findByFunction: (expr: string) => CalculationRecord[];
  findByAxis: (axis: string) => CalculationRecord[];
  findByResult: (volume: number, tolerance?: number) => CalculationRecord[];
  addModification: (mod: ModificationEntry) => void;
  clearPendingModifications: () => void;
  loadFromStorage: () => void;
}

function loadRecords(): CalculationRecord[] {
  try {
    const saved = localStorage.getItem('rotation_solid_records');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return [];
}

function saveRecords(records: CalculationRecord[]): void {
  localStorage.setItem('rotation_solid_records', JSON.stringify(records));
}

export const useRecordStore = create<RecordStore>((set, get) => ({
  records: loadRecords(),
  activeRecordId: null,
  filter: {
    functionSearch: '',
    axisFilter: 'all',
    statusFilter: 'all',
  },
  pendingModifications: [],

  createRecord: (params: ParamState, result: CalculationResult): string => {
    const id = `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const record: CalculationRecord = {
      id,
      createdAt: now,
      updatedAt: now,
      params: { ...params },
      result: { ...result },
      modificationHistory: [...get().pendingModifications],
      reviewStatus: params.validation.reviewStatus,
    };

    set((state) => {
      const newRecords = [record, ...state.records];
      saveRecords(newRecords);
      return {
        records: newRecords,
        activeRecordId: id,
        pendingModifications: [],
      };
    });

    return id;
  },

  updateRecord: (id: string, changes: Partial<ParamState>, result: CalculationResult): void => {
    const mods = get().pendingModifications;

    set((state) => {
      const newRecords = state.records.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          updatedAt: new Date().toISOString(),
          params: { ...r.params, ...changes },
          result: { ...result },
          modificationHistory: [...r.modificationHistory, ...mods],
          reviewStatus: changes.validation?.reviewStatus || r.reviewStatus,
        };
      });
      saveRecords(newRecords);
      return { records: newRecords, pendingModifications: [] };
    });
  },

  loadRecord: (id: string): ParamState | null => {
    const record = get().records.find((r) => r.id === id);
    if (!record) return null;
    set({ activeRecordId: id });
    return record.params;
  },

  deleteRecord: (id: string): void => {
    set((state) => {
      const newRecords = state.records.filter((r) => r.id !== id);
      saveRecords(newRecords);
      return {
        records: newRecords,
        activeRecordId: state.activeRecordId === id ? null : state.activeRecordId,
      };
    });
  },

  setFilter: (key: keyof RecordFilter, value: unknown): void => {
    set((state) => ({
      filter: { ...state.filter, [key]: value },
    }));
  },

  getFilteredRecords: (): CalculationRecord[] => {
    const { records, filter } = get();
    return records.filter((r) => {
      if (filter.functionSearch && !r.params.functionExpr.toLowerCase().includes(filter.functionSearch.toLowerCase())) {
        return false;
      }
      if (filter.axisFilter !== 'all' && r.params.rotationAxis !== filter.axisFilter) {
        return false;
      }
      if (filter.statusFilter !== 'all' && r.reviewStatus !== filter.statusFilter) {
        return false;
      }
      if (filter.volumeRange) {
        const [min, max] = filter.volumeRange;
        if (r.result.volume < min || r.result.volume > max) return false;
      }
      return true;
    });
  },

  findByFunction: (expr: string): CalculationRecord[] => {
    return get().records.filter((r) => r.params.functionExpr === expr);
  },

  findByAxis: (axis: string): CalculationRecord[] => {
    return get().records.filter((r) => r.params.rotationAxis === axis);
  },

  findByResult: (volume: number, tolerance: number = 0.001): CalculationRecord[] => {
    return get().records.filter((r) => Math.abs(r.result.volume - volume) < tolerance);
  },

  addModification: (mod: ModificationEntry): void => {
    set((state) => ({
      pendingModifications: [...state.pendingModifications, mod],
    }));
  },

  clearPendingModifications: (): void => {
    set({ pendingModifications: [] });
  },

  loadFromStorage: (): void => {
    set({ records: loadRecords() });
  },
}));
