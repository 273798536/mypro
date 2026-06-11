import { createContext, useContext, useReducer, useMemo, useEffect, ReactNode } from 'react';
import type { RiskRecord, FilterConditions, SummaryStats, AppState } from '../types';
import { mockRiskRecords } from '../data/mockData';
import { generateMarkdownReport } from '../utils/reportGenerator';

const STORAGE_KEYS = {
  records: 'greenBond_records',
  filters: 'greenBond_filters',
  reportContent: 'greenBond_reportContent',
  selectedRecordId: 'greenBond_selectedRecordId',
} as const;

const initialFilters: FilterConditions = {
  riskLevel: 'all',
  processingStatus: 'all',
  isAnomaly: 'all',
  hasWithdrawal: 'all',
  bondCode: '',
  dateRange: {
    start: '',
    end: ''
  }
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable — silently degrade
  }
}

function buildInitialState(): AppState {
  const savedRecords = loadFromStorage<RiskRecord[] | null>(STORAGE_KEYS.records, null);
  const savedFilters = loadFromStorage<FilterConditions | null>(STORAGE_KEYS.filters, null);
  const savedReportContent = loadFromStorage<string | null>(STORAGE_KEYS.reportContent, null);
  const savedSelectedId = loadFromStorage<string | null>(STORAGE_KEYS.selectedRecordId, null);

  return {
    records: savedRecords ?? mockRiskRecords,
    filters: savedFilters ?? initialFilters,
    selectedRecordId: savedSelectedId,
    reportContent: savedReportContent ?? '',
  };
}

type Action =
  | { type: 'SET_FILTERS'; payload: Partial<FilterConditions> }
  | { type: 'RESET_FILTERS' }
  | { type: 'SELECT_RECORD'; payload: string | null }
  | { type: 'ADD_NOTE'; payload: { recordId: string; note: RiskRecord['manualNotes'][number] } }
  | { type: 'WITHDRAW_NOTE'; payload: { recordId: string; noteId: string; withdrawnBy: string; conclusion: string } }
  | { type: 'UPDATE_RECORD'; payload: { recordId: string; updates: Partial<RiskRecord> } }
  | { type: 'GENERATE_REPORT' }
  | { type: 'CLEAR_PERSISTENCE' };

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload }
      };
    case 'RESET_FILTERS':
      return {
        ...state,
        filters: initialFilters
      };
    case 'SELECT_RECORD':
      return {
        ...state,
        selectedRecordId: action.payload
      };
    case 'ADD_NOTE':
      return {
        ...state,
        records: state.records.map(r =>
          r.id === action.payload.recordId
            ? { ...r, manualNotes: [...r.manualNotes, action.payload.note], updatedAt: new Date().toISOString() }
            : r
        )
      };
    case 'WITHDRAW_NOTE':
      return {
        ...state,
        records: state.records.map(r => {
          if (r.id !== action.payload.recordId) return r;
          const updatedNotes = r.manualNotes.map(n =>
            n.id === action.payload.noteId
              ? { ...n, isWithdrawn: true, withdrawnAt: new Date().toISOString(), withdrawnBy: action.payload.withdrawnBy }
              : n
          );
          updatedNotes.push({
            id: `N${Date.now()}`,
            content: action.payload.conclusion,
            author: action.payload.withdrawnBy,
            authorRole: '资金主管',
            createdAt: new Date().toISOString(),
            isWithdrawn: false,
            source: 'manual',
            history: []
          });
          return { ...r, manualNotes: updatedNotes, updatedAt: new Date().toISOString() };
        })
      };
    case 'UPDATE_RECORD':
      return {
        ...state,
        records: state.records.map(r =>
          r.id === action.payload.recordId
            ? { ...r, ...action.payload.updates, updatedAt: new Date().toISOString() }
            : r
        )
      };
    case 'GENERATE_REPORT':
      return {
        ...state,
        reportContent: generateMarkdownReport(state.records, state.filters)
      };
    case 'CLEAR_PERSISTENCE':
      return {
        records: mockRiskRecords,
        filters: initialFilters,
        selectedRecordId: null,
        reportContent: '',
      };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  filteredRecords: RiskRecord[];
  summaryStats: SummaryStats;
  selectedRecord: RiskRecord | null;
  setFilters: (filters: Partial<FilterConditions>) => void;
  resetFilters: () => void;
  selectRecord: (id: string | null) => void;
  addNote: (recordId: string, note: RiskRecord['manualNotes'][number]) => void;
  withdrawNote: (recordId: string, noteId: string, withdrawnBy: string, conclusion: string) => void;
  updateRecord: (recordId: string, updates: Partial<RiskRecord>) => void;
  generateReport: () => void;
  clearPersistence: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, null, buildInitialState);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.records, state.records);
  }, [state.records]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.filters, state.filters);
  }, [state.filters]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.reportContent, state.reportContent);
  }, [state.reportContent]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.selectedRecordId, state.selectedRecordId);
  }, [state.selectedRecordId]);

  const filteredRecords = useMemo(() => {
    return state.records.filter(record => {
      if (state.filters.riskLevel !== 'all' && record.riskLevel !== state.filters.riskLevel) return false;
      if (state.filters.processingStatus !== 'all' && record.processingStatus !== state.filters.processingStatus) return false;
      if (state.filters.isAnomaly !== 'all' && record.isAnomaly !== state.filters.isAnomaly) return false;
      if (state.filters.hasWithdrawal !== 'all') {
        const hasWithdrawal = !!record.withdrawalRecord || record.manualNotes.some(n => n.isWithdrawn);
        if (hasWithdrawal !== state.filters.hasWithdrawal) return false;
      }
      if (state.filters.bondCode && !record.bondCode.toLowerCase().includes(state.filters.bondCode.toLowerCase())) return false;
      if (state.filters.dateRange.start && record.raiseDate < state.filters.dateRange.start) return false;
      if (state.filters.dateRange.end && record.raiseDate > state.filters.dateRange.end) return false;
      return true;
    });
  }, [state.records, state.filters]);

  const summaryStats = useMemo((): SummaryStats => {
    const validRecords = filteredRecords.filter(r => r.processingStatus !== 'currency_error' && r.processingStatus !== 'withdrawn');
    return {
      total: filteredRecords.length,
      highRisk: validRecords.filter(r => r.riskLevel === 'high').length,
      mediumRisk: validRecords.filter(r => r.riskLevel === 'medium').length,
      lowRisk: validRecords.filter(r => r.riskLevel === 'low').length,
      anomalyCount: filteredRecords.filter(r => r.isAnomaly).length,
      withdrawalCount: filteredRecords.filter(r => r.withdrawalRecord || r.manualNotes.some(n => n.isWithdrawn)).length,
      pendingCount: filteredRecords.filter(r => r.processingStatus.includes('pending')).length,
      currencyErrorCount: filteredRecords.filter(r => r.processingStatus === 'currency_error').length
    };
  }, [filteredRecords]);

  const selectedRecord = useMemo(() => {
    return state.records.find(r => r.id === state.selectedRecordId) || null;
  }, [state.records, state.selectedRecordId]);

  const clearPersistence = () => {
    Object.values(STORAGE_KEYS).forEach(key => {
      try { localStorage.removeItem(key); } catch { /* noop */ }
    });
    dispatch({ type: 'CLEAR_PERSISTENCE' });
  };

  const value: AppContextValue = {
    state,
    filteredRecords,
    summaryStats,
    selectedRecord,
    setFilters: (filters) => dispatch({ type: 'SET_FILTERS', payload: filters }),
    resetFilters: () => dispatch({ type: 'RESET_FILTERS' }),
    selectRecord: (id) => dispatch({ type: 'SELECT_RECORD', payload: id }),
    addNote: (recordId, note) => dispatch({ type: 'ADD_NOTE', payload: { recordId, note } }),
    withdrawNote: (recordId, noteId, withdrawnBy, conclusion) =>
      dispatch({ type: 'WITHDRAW_NOTE', payload: { recordId, noteId, withdrawnBy, conclusion } }),
    updateRecord: (recordId, updates) => dispatch({ type: 'UPDATE_RECORD', payload: { recordId, updates } }),
    generateReport: () => dispatch({ type: 'GENERATE_REPORT' }),
    clearPersistence,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
