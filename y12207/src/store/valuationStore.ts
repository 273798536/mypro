import { create } from 'zustand';
import type { 
  Project, 
  Valuation, 
  ValuationLog, 
  Conflict, 
  FilterState,
  ImportFile,
  DataSourceType 
} from '@/types';
import { mockProjects, mockValuations, mockValuationLogs, mockConflicts } from '@/data/mockData';

interface ValuationState {
  projects: Project[];
  valuations: Valuation[];
  valuationLogs: ValuationLog[];
  conflicts: Conflict[];
  filters: FilterState;
  importFiles: ImportFile[];
  selectedValuationId: string | null;
  
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  addImportFile: (file: ImportFile) => void;
  updateImportFile: (id: string, updates: Partial<ImportFile>) => void;
  getFilteredValuations: () => Valuation[];
  getValuationById: (id: string) => Valuation | undefined;
  getConflictsByValuation: (valuationId: string) => Conflict[];
  getLogsByValuation: (valuationId: string) => ValuationLog[];
  updateValuation: (id: string, updates: Partial<Valuation>, reason: string, modifiedBy: string) => void;
  resolveConflict: (conflictId: string, resolvedBy: string) => void;
  selectValuation: (id: string | null) => void;
  addValuation: (valuation: Omit<Valuation, 'valuationId' | 'createdAt' | 'updatedAt'>) => void;
}

const defaultFilters: FilterState = {
  fundNames: [],
  projectIds: [],
  dateRange: { start: '2024-01-01', end: '2025-12-31' },
  valuationMethods: [],
  dataSources: [],
};

export const useValuationStore = create<ValuationState>((set, get) => ({
  projects: mockProjects,
  valuations: mockValuations,
  valuationLogs: mockValuationLogs,
  conflicts: mockConflicts,
  filters: defaultFilters,
  importFiles: [],
  selectedValuationId: null,

  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
  })),

  resetFilters: () => set({ filters: defaultFilters }),

  addImportFile: (file) => set((state) => ({
    importFiles: [...state.importFiles, file],
  })),

  updateImportFile: (id, updates) => set((state) => ({
    importFiles: state.importFiles.map((f) =>
      f.id === id ? { ...f, ...updates } : f
    ),
  })),

  getFilteredValuations: () => {
    const state = get();
    let result = [...state.valuations];
    
    if (state.filters.fundNames.length > 0) {
      result = result.filter((v) => state.filters.fundNames.includes(v.fundName || ''));
    }
    
    if (state.filters.projectIds.length > 0) {
      result = result.filter((v) => state.filters.projectIds.includes(v.projectId));
    }
    
    if (state.filters.valuationMethods.length > 0) {
      result = result.filter((v) => state.filters.valuationMethods.includes(v.valuationMethod));
    }
    
    if (state.filters.dataSources.length > 0) {
      result = result.filter((v) => 
        state.filters.dataSources.includes(v.dataSource as DataSourceType)
      );
    }
    
    result = result.filter((v) => {
      const date = new Date(v.valuationDate);
      const start = new Date(state.filters.dateRange.start);
      const end = new Date(state.filters.dateRange.end);
      return date >= start && date <= end;
    });
    
    return result;
  },

  getValuationById: (id) => get().valuations.find((v) => v.valuationId === id),

  getConflictsByValuation: (valuationId) => 
    get().conflicts.filter((c) => c.valuationId === valuationId),

  getLogsByValuation: (valuationId) =>
    get().valuationLogs.filter((l) => l.valuationId === valuationId),

  updateValuation: (id, updates, reason, modifiedBy) => {
    const state = get();
    const valuation = state.valuations.find((v) => v.valuationId === id);
    if (!valuation) return;

    const logs: ValuationLog[] = [];
    const now = new Date().toISOString();

    Object.entries(updates).forEach(([key, value]) => {
      const oldValue = valuation[key as keyof Valuation];
      if (oldValue !== value) {
        logs.push({
          logId: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          valuationId: id,
          projectId: valuation.projectId,
          projectName: valuation.projectName,
          fieldName: key,
          oldValue: oldValue as string | number,
          newValue: value as string | number,
          modifiedBy,
          modifiedAt: now,
          reason,
          impactScope: [valuation.projectName || valuation.projectId],
        });
      }
    });

    set((state) => ({
      valuations: state.valuations.map((v) =>
        v.valuationId === id 
          ? { ...v, ...updates, updatedAt: now, isManual: true, modifiedBy }
          : v
      ),
      valuationLogs: [...state.valuationLogs, ...logs],
    }));
  },

  resolveConflict: (conflictId, resolvedBy) => set((state) => ({
    conflicts: state.conflicts.map((c) =>
      c.conflictId === conflictId
        ? { ...c, resolved: true, resolvedAt: new Date().toISOString(), resolvedBy }
        : c
    ),
  })),

  selectValuation: (id) => set({ selectedValuationId: id }),

  addValuation: (valuation) => set((state) => ({
    valuations: [...state.valuations, {
      ...valuation,
      valuationId: `val-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }],
  })),
}));
