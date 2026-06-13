import React, { createContext, useContext, useReducer, useMemo } from 'react';
import type { MotorTorqueRecord, FilterCriteria, PageSummary, ExportConfig } from '../types';
import { detectOutliers, markDuplicateDevices, markDirtyData } from '../utils/dataAnalysis';
import { filterRecords, generatePageSummary, getDefaultFilterCriteria } from '../utils/filter';

interface AppState {
  allRecords: MotorTorqueRecord[];
  filterCriteria: FilterCriteria;
  selectedRecordId: string | null;
  showDetailModal: boolean;
  showExportModal: boolean;
  showGuideModal: boolean;
  exportConfig: ExportConfig;
  isLoading: boolean;
}

type AppAction =
  | { type: 'SET_RECORDS'; payload: MotorTorqueRecord[] }
  | { type: 'SET_FILTER'; payload: Partial<FilterCriteria> }
  | { type: 'RESET_FILTER' }
  | { type: 'SELECT_RECORD'; payload: string | null }
  | { type: 'TOGGLE_DETAIL_MODAL'; payload: boolean }
  | { type: 'TOGGLE_EXPORT_MODAL'; payload: boolean }
  | { type: 'TOGGLE_GUIDE_MODAL'; payload: boolean }
  | { type: 'SET_EXPORT_CONFIG'; payload: Partial<ExportConfig> }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: AppState = {
  allRecords: [],
  filterCriteria: getDefaultFilterCriteria(),
  selectedRecordId: null,
  showDetailModal: false,
  showExportModal: false,
  showGuideModal: false,
  exportConfig: {
    include_summary: true,
    include_filter_criteria: true,
    include_raw_data: true,
    include_diagnosis: true,
    include_outlier_markers: true,
    format: 'xlsx'
  },
  isLoading: false
};

function processRecords(records: MotorTorqueRecord[]): MotorTorqueRecord[] {
  let processed = markDirtyData(records);
  processed = markDuplicateDevices(processed);
  processed = detectOutliers(processed);
  return processed;
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_RECORDS':
      return {
        ...state,
        allRecords: processRecords(action.payload),
        isLoading: false
      };
    case 'SET_FILTER':
      return {
        ...state,
        filterCriteria: {
          ...state.filterCriteria,
          ...action.payload
        }
      };
    case 'RESET_FILTER':
      return {
        ...state,
        filterCriteria: getDefaultFilterCriteria()
      };
    case 'SELECT_RECORD':
      return {
        ...state,
        selectedRecordId: action.payload
      };
    case 'TOGGLE_DETAIL_MODAL':
      return {
        ...state,
        showDetailModal: action.payload
      };
    case 'TOGGLE_EXPORT_MODAL':
      return {
        ...state,
        showExportModal: action.payload
      };
    case 'TOGGLE_GUIDE_MODAL':
      return {
        ...state,
        showGuideModal: action.payload
      };
    case 'SET_EXPORT_CONFIG':
      return {
        ...state,
        exportConfig: {
          ...state.exportConfig,
          ...action.payload
        }
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  filteredRecords: MotorTorqueRecord[];
  pageSummary: PageSummary;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const filteredRecords = useMemo(() => {
    return filterRecords(state.allRecords, state.filterCriteria);
  }, [state.allRecords, state.filterCriteria]);

  const pageSummary = useMemo(() => {
    return generatePageSummary(state.allRecords, filteredRecords, state.filterCriteria);
  }, [state.allRecords, filteredRecords, state.filterCriteria]);

  return (
    <AppContext.Provider value={{ state, dispatch, filteredRecords, pageSummary }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
