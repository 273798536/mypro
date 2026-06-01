import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { recalculateAllForRecord } from './physics';
import { detectAnomalies } from './anomalyDetector';
import { loadSampleData } from './sampleData';
import type { 
  AppState, 
  PendulumRecord, 
  Batch, 
  PeriodCalculation, 
  ErrorEstimate, 
  AnomalyInfo,
  TracePath,
  ReportExport,
  ReportSummary
} from './types';

type Action =
  | { type: 'ADD_RECORD'; payload: PendulumRecord }
  | { type: 'UPDATE_RECORD'; payload: PendulumRecord }
  | { type: 'DELETE_RECORD'; payload: string }
  | { type: 'ADD_BATCH'; payload: Batch }
  | { type: 'UPDATE_BATCH'; payload: Batch }
  | { type: 'DELETE_BATCH'; payload: string }
  | { type: 'SELECT_RECORD'; payload: string | null }
  | { type: 'SELECT_BATCH'; payload: string | null }
  | { type: 'SET_TRACE_PATH'; payload: TracePath | null }
  | { type: 'RECALCULATE_ALL' }
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'ADD_REPORT'; payload: ReportExport }
  | { type: 'DELETE_REPORT'; payload: string };

const STORAGE_KEY = 'pendulum-error-panel-state';

const recalculateDependentData = (state: AppState): Omit<AppState, 'selectedRecordId' | 'selectedBatchId' | 'tracePath'> => {
  const newCalculations: PeriodCalculation[] = [];
  const newErrorEstimates: ErrorEstimate[] = [];
  const newAnomalies: AnomalyInfo[] = [];

  state.records.forEach(record => {
    const { calculation, errorEstimate } = recalculateAllForRecord(record);
    newCalculations.push(calculation);
    newErrorEstimates.push(errorEstimate);

    const batchRecords = state.records.filter(r => r.batchId === record.batchId);
    const anomalies = detectAnomalies(record, calculation, batchRecords);
    newAnomalies.push(...anomalies);
  });

  return {
    batches: state.batches,
    records: state.records,
    calculations: newCalculations,
    errorEstimates: newErrorEstimates,
    anomalies: newAnomalies,
    reports: state.reports
  };
};

const initialState: AppState = {
  batches: [],
  records: [],
  calculations: [],
  errorEstimates: [],
  anomalies: [],
  reports: [],
  selectedRecordId: null,
  selectedBatchId: null,
  tracePath: null
};

const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'ADD_RECORD': {
      const newState = {
        ...state,
        records: [...state.records, action.payload]
      };
      return {
        ...recalculateDependentData(newState),
        selectedRecordId: state.selectedRecordId,
        selectedBatchId: state.selectedBatchId,
        tracePath: state.tracePath
      };
    }
    case 'UPDATE_RECORD': {
      const newRecords = state.records.map(r => 
        r.id === action.payload.id ? action.payload : r
      );
      const newState = { ...state, records: newRecords };
      return {
        ...recalculateDependentData(newState),
        selectedRecordId: state.selectedRecordId,
        selectedBatchId: state.selectedBatchId,
        tracePath: state.tracePath
      };
    }
    case 'DELETE_RECORD': {
      const newRecords = state.records.filter(r => r.id !== action.payload);
      const newState = { ...state, records: newRecords };
      const recalculated = recalculateDependentData(newState);
      return {
        ...recalculated,
        selectedRecordId: state.selectedRecordId === action.payload ? null : state.selectedRecordId,
        selectedBatchId: state.selectedBatchId,
        tracePath: state.selectedRecordId === action.payload ? null : state.tracePath
      };
    }
    case 'ADD_BATCH': {
      return {
        ...state,
        batches: [...state.batches, action.payload]
      };
    }
    case 'UPDATE_BATCH': {
      return {
        ...state,
        batches: state.batches.map(b => 
          b.id === action.payload.id ? action.payload : b
        )
      };
    }
    case 'DELETE_BATCH': {
      const batchRecords = state.records.filter(r => r.batchId === action.payload);
      const newRecords = state.records.filter(r => r.batchId !== action.payload);
      const newState = {
        ...state,
        batches: state.batches.filter(b => b.id !== action.payload),
        records: newRecords
      };
      const recalculated = recalculateDependentData(newState);
      return {
        ...recalculated,
        selectedRecordId: batchRecords.some(r => r.id === state.selectedRecordId) 
          ? null 
          : state.selectedRecordId,
        selectedBatchId: state.selectedBatchId === action.payload ? null : state.selectedBatchId,
        tracePath: state.tracePath
      };
    }
    case 'SELECT_RECORD': {
      return {
        ...state,
        selectedRecordId: action.payload,
        tracePath: action.payload ? {
          from: 'record',
          recordId: action.payload,
          step: 'record'
        } : null
      };
    }
    case 'SELECT_BATCH': {
      return {
        ...state,
        selectedBatchId: action.payload
      };
    }
    case 'SET_TRACE_PATH': {
      return {
        ...state,
        tracePath: action.payload
      };
    }
    case 'RECALCULATE_ALL': {
      return {
        ...recalculateDependentData(state),
        selectedRecordId: state.selectedRecordId,
        selectedBatchId: state.selectedBatchId,
        tracePath: state.tracePath
      };
    }
    case 'LOAD_STATE': {
      return {
        ...recalculateDependentData(action.payload),
        selectedRecordId: action.payload.selectedRecordId,
        selectedBatchId: action.payload.selectedBatchId,
        tracePath: action.payload.tracePath
      };
    }
    case 'ADD_REPORT': {
      return {
        ...state,
        reports: [...state.reports, action.payload]
      };
    }
    case 'DELETE_REPORT': {
      return {
        ...state,
        reports: state.reports.filter(r => r.id !== action.payload)
      };
    }
    default:
      return state;
  }
};

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  addRecord: (record: Omit<PendulumRecord, 'id' | 'timestamp'>) => void;
  updateRecord: (record: PendulumRecord) => void;
  deleteRecord: (id: string) => void;
  addBatch: (batch: Omit<Batch, 'id' | 'createdAt' | 'recordIds'>) => void;
  updateBatch: (batch: Batch) => void;
  deleteBatch: (id: string) => void;
  selectRecord: (id: string | null) => void;
  selectBatch: (id: string | null) => void;
  setTracePath: (path: TracePath | null) => void;
  getRecordCalculation: (recordId: string) => PeriodCalculation | undefined;
  getRecordErrorEstimate: (recordId: string) => ErrorEstimate | undefined;
  getRecordAnomalies: (recordId: string) => AnomalyInfo[];
  getBatchRecords: (batchId: string) => PendulumRecord[];
  generateReport: (batchId: string, title: string) => ReportExport;
  generateReportSummary: (recordIds: string[]) => ReportSummary;
  exportToJSON: (batchId: string) => string;
  exportToCSV: (batchId: string) => string;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.records && parsed.records.length > 0) {
          dispatch({ type: 'LOAD_STATE', payload: parsed });
        } else {
          const sampleData = loadSampleData();
          if (sampleData) {
            const initialStateWithSamples: AppState = {
              ...initialState,
              batches: sampleData.batches,
              records: sampleData.records
            };
            dispatch({ type: 'LOAD_STATE', payload: initialStateWithSamples });
          }
        }
      } catch (e) {
        console.error('Failed to load saved state:', e);
        const sampleData = loadSampleData();
        if (sampleData) {
          const initialStateWithSamples: AppState = {
            ...initialState,
            batches: sampleData.batches,
            records: sampleData.records
          };
          dispatch({ type: 'LOAD_STATE', payload: initialStateWithSamples });
        }
      }
    } else {
      const sampleData = loadSampleData();
      if (sampleData) {
        const initialStateWithSamples: AppState = {
          ...initialState,
          batches: sampleData.batches,
          records: sampleData.records
        };
        dispatch({ type: 'LOAD_STATE', payload: initialStateWithSamples });
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addRecord = (record: Omit<PendulumRecord, 'id' | 'timestamp'>) => {
    const newRecord: PendulumRecord = {
      ...record,
      id: generateId(),
      timestamp: Date.now()
    };
    dispatch({ type: 'ADD_RECORD', payload: newRecord });
    
    const batch = state.batches.find(b => b.id === record.batchId);
    if (batch) {
      dispatch({
        type: 'UPDATE_BATCH',
        payload: {
          ...batch,
          recordIds: [...batch.recordIds, newRecord.id]
        }
      });
    }
  };

  const updateRecord = (record: PendulumRecord) => {
    dispatch({ type: 'UPDATE_RECORD', payload: record });
  };

  const deleteRecord = (id: string) => {
    const record = state.records.find(r => r.id === id);
    if (record) {
      const batch = state.batches.find(b => b.id === record.batchId);
      if (batch) {
        dispatch({
          type: 'UPDATE_BATCH',
          payload: {
            ...batch,
            recordIds: batch.recordIds.filter(rid => rid !== id)
          }
        });
      }
    }
    dispatch({ type: 'DELETE_RECORD', payload: id });
  };

  const addBatch = (batch: Omit<Batch, 'id' | 'createdAt' | 'recordIds'>) => {
    const newBatch: Batch = {
      ...batch,
      id: generateId(),
      createdAt: Date.now(),
      recordIds: []
    };
    dispatch({ type: 'ADD_BATCH', payload: newBatch });
  };

  const updateBatch = (batch: Batch) => {
    dispatch({ type: 'UPDATE_BATCH', payload: batch });
  };

  const deleteBatch = (id: string) => {
    dispatch({ type: 'DELETE_BATCH', payload: id });
  };

  const selectRecord = (id: string | null) => {
    dispatch({ type: 'SELECT_RECORD', payload: id });
  };

  const selectBatch = (id: string | null) => {
    dispatch({ type: 'SELECT_BATCH', payload: id });
  };

  const setTracePath = (path: TracePath | null) => {
    dispatch({ type: 'SET_TRACE_PATH', payload: path });
  };

  const getRecordCalculation = (recordId: string) => {
    return state.calculations.find(c => c.recordId === recordId);
  };

  const getRecordErrorEstimate = (recordId: string) => {
    return state.errorEstimates.find(e => e.recordId === recordId);
  };

  const getRecordAnomalies = (recordId: string) => {
    return state.anomalies.filter(a => a.recordId === recordId);
  };

  const getBatchRecords = (batchId: string) => {
    return state.records.filter(r => r.batchId === batchId);
  };

  const generateReportSummary = (recordIds: string[]): ReportSummary => {
    const records = state.records.filter(r => recordIds.includes(r.id));
    const calculations = records.map(r => getRecordCalculation(r.id)).filter(Boolean) as PeriodCalculation[];
    const errors = records.map(r => getRecordErrorEstimate(r.id)).filter(Boolean) as ErrorEstimate[];
    const batchAnomalies = recordIds.flatMap(rid => getRecordAnomalies(rid));

    return {
      totalRecords: records.length,
      averagePeriod: calculations.length > 0 
        ? calculations.reduce((sum, c) => sum + (c.usesLargeAngle ? c.largeAnglePeriod : c.smallAnglePeriod), 0) / calculations.length
        : 0,
      averageError: errors.length > 0
        ? errors.reduce((sum, e) => sum + e.totalError, 0) / errors.length
        : 0,
      anomalyCount: batchAnomalies.length,
      largeAngleCount: batchAnomalies.filter(a => a.type === 'large_angle_approx').length,
      unitErrorCount: batchAnomalies.filter(a => a.type === 'length_unit_error').length,
      timingMissCount: batchAnomalies.filter(a => a.type === 'timing_missed').length
    };
  };

  const generateReport = (batchId: string, title: string): ReportExport => {
    const batch = state.batches.find(b => b.id === batchId);
    if (!batch) throw new Error('Batch not found');

    const recordIds = batch.recordIds;
    const summary = generateReportSummary(recordIds);

    const report: ReportExport = {
      id: generateId(),
      batchId,
      recordIds,
      createdAt: Date.now(),
      exportedAt: Date.now(),
      format: 'json',
      title,
      summary
    };

    dispatch({ type: 'ADD_REPORT', payload: report });
    return report;
  };

  const exportToJSON = (batchId: string): string => {
    const batch = state.batches.find(b => b.id === batchId);
    if (!batch) return '';

    const records = getBatchRecords(batchId);
    const calculations = records.map(r => ({
      record: r,
      calculation: getRecordCalculation(r.id),
      errorEstimate: getRecordErrorEstimate(r.id),
      anomalies: getRecordAnomalies(r.id)
    }));

    const reportData = {
      batch,
      summary: generateReportSummary(batch.recordIds),
      exportedAt: new Date().toISOString(),
      records: calculations
    };

    return JSON.stringify(reportData, null, 2);
  };

  const exportToCSV = (batchId: string): string => {
    const records = getBatchRecords(batchId);
    
    const headers = [
      '记录ID', '摆长', '摆长单位', '角度', '角度单位',
      '小角度周期(s)', '大角度周期(s)', '修正量(%)',
      '测量周期(s)', '测量误差(%)', '总误差(%)',
      '系统误差(%)', '随机误差(%)', '异常类型', '备注'
    ].join(',');

    const rows = records.map(r => {
      const calc = getRecordCalculation(r.id);
      const error = getRecordErrorEstimate(r.id);
      const anomalies = getRecordAnomalies(r.id);
      const anomalyTypes = anomalies.map(a => a.type).join(';') || '无';

      return [
        r.id,
        r.length,
        r.lengthUnit,
        r.angle,
        r.angleUnit,
        calc?.smallAnglePeriod.toFixed(4) || '',
        calc?.largeAnglePeriod.toFixed(4) || '',
        calc?.largeAngleCorrection.toFixed(2) || '',
        r.measuredPeriod.toFixed(4),
        calc?.measuredError.toFixed(2) || '',
        error?.totalError.toFixed(3) || '',
        error?.systematicError.toFixed(3) || '',
        error?.randomError.toFixed(3) || '',
        anomalyTypes,
        `"${r.notes.replace(/"/g, '""')}"`
      ].join(',');
    });

    return [headers, ...rows].join('\n');
  };

  const value: AppContextType = {
    state,
    dispatch,
    addRecord,
    updateRecord,
    deleteRecord,
    addBatch,
    updateBatch,
    deleteBatch,
    selectRecord,
    selectBatch,
    setTracePath,
    getRecordCalculation,
    getRecordErrorEstimate,
    getRecordAnomalies,
    getBatchRecords,
    generateReport,
    generateReportSummary,
    exportToJSON,
    exportToCSV
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
