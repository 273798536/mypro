import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState, AppAction, AnomalyStatus, FilterState, AnomalyRecord, ProcessingRecord, HistoryLog, CameraState, ExportSnapshot, ContainerPosition } from '../types';

const initialFilters: FilterState = {
  anomalyType: [],
  severity: [],
  status: [],
  dateRange: null,
  importBatch: [],
};

const initialState: AppState = {
  containers: [],
  anomalies: [],
  processingRecords: [],
  historyLogs: [],
  currentView: '3d',
  selectedAnomaly: null,
  filters: initialFilters,
  cameraStates: [],
  isFirstVisit: true,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'IMPORT_DATA':
      return {
        ...state,
        containers: [...state.containers, ...action.payload],
      };
    case 'DETECT_ANOMALIES':
      return {
        ...state,
        anomalies: [...state.anomalies, ...action.payload],
      };
    case 'ADD_PROCESSING_RECORD':
      return {
        ...state,
        processingRecords: [...state.processingRecords, action.payload],
      };
    case 'UPDATE_ANOMALY_STATUS':
      return {
        ...state,
        anomalies: state.anomalies.map((a) =>
          a.id === action.payload.id
            ? { ...a, status: action.payload.status, updatedAt: new Date() }
            : a
        ),
      };
    case 'ADD_HISTORY_LOG':
      return {
        ...state,
        historyLogs: [...state.historyLogs, action.payload],
      };
    case 'SAVE_CAMERA_STATE':
      return {
        ...state,
        cameraStates: [...state.cameraStates, action.payload],
      };
    case 'EXPORT_DATA':
      return {
        ...state,
        processingRecords: state.processingRecords.map((pr) => {
          const match = action.payload.processingRecords.find((p) => p.id === pr.id);
          return match ? { ...pr, exportSnapshot: action.payload } : pr;
        }),
      };
    case 'SET_CURRENT_VIEW':
      return {
        ...state,
        currentView: action.payload,
      };
    case 'SET_SELECTED_ANOMALY':
      return {
        ...state,
        selectedAnomaly: action.payload,
      };
    case 'UPDATE_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };
    case 'LOAD_INITIAL_DATA':
      return {
        ...state,
        ...action.payload,
      };
    case 'SET_FIRST_VISIT':
      return {
        ...state,
        isFirstVisit: action.payload,
      };
    default:
      return state;
  }
}

interface AppStore extends AppState {
  dispatch: (action: AppAction) => void;
  importData: (containers: ContainerPosition[]) => void;
  detectAnomalies: (anomalies: AnomalyRecord[]) => void;
  addProcessingRecord: (record: ProcessingRecord) => void;
  updateAnomalyStatus: (id: string, status: AnomalyStatus) => void;
  addHistoryLog: (log: HistoryLog) => void;
  saveCameraState: (camera: CameraState) => void;
  exportData: (snapshot: ExportSnapshot) => void;
  setCurrentView: (view: '3d' | 'list') => void;
  setSelectedAnomaly: (anomaly: AnomalyRecord | null) => void;
  updateFilters: (filters: Partial<FilterState>) => void;
  loadInitialData: (data: Partial<AppState>) => void;
  setFirstVisit: (isFirst: boolean) => void;
  getAnomaliesById: (id: string) => AnomalyRecord | undefined;
  getProcessingRecordsByAnomalyId: (anomalyId: string) => ProcessingRecord[];
  getHistoryLogsByTargetId: (targetId: string) => HistoryLog[];
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      dispatch: (action: AppAction) => {
        set((state) => appReducer(state, action));
      },
      importData: (containers: ContainerPosition[]) => {
        set((state) => appReducer(state, { type: 'IMPORT_DATA', payload: containers }));
      },
      detectAnomalies: (anomalies: AnomalyRecord[]) => {
        set((state) => appReducer(state, { type: 'DETECT_ANOMALIES', payload: anomalies }));
      },
      addProcessingRecord: (record: ProcessingRecord) => {
        set((state) => appReducer(state, { type: 'ADD_PROCESSING_RECORD', payload: record }));
      },
      updateAnomalyStatus: (id: string, status: AnomalyStatus) => {
        set((state) => appReducer(state, { type: 'UPDATE_ANOMALY_STATUS', payload: { id, status } }));
      },
      addHistoryLog: (log: HistoryLog) => {
        set((state) => appReducer(state, { type: 'ADD_HISTORY_LOG', payload: log }));
      },
      saveCameraState: (camera: CameraState) => {
        set((state) => appReducer(state, { type: 'SAVE_CAMERA_STATE', payload: camera }));
      },
      exportData: (snapshot: ExportSnapshot) => {
        set((state) => appReducer(state, { type: 'EXPORT_DATA', payload: snapshot }));
      },
      setCurrentView: (view: '3d' | 'list') => {
        set((state) => appReducer(state, { type: 'SET_CURRENT_VIEW', payload: view }));
      },
      setSelectedAnomaly: (anomaly: AnomalyRecord | null) => {
        set((state) => appReducer(state, { type: 'SET_SELECTED_ANOMALY', payload: anomaly }));
      },
      updateFilters: (filters: Partial<FilterState>) => {
        set((state) => appReducer(state, { type: 'UPDATE_FILTERS', payload: filters }));
      },
      loadInitialData: (data: Partial<AppState>) => {
        set((state) => appReducer(state, { type: 'LOAD_INITIAL_DATA', payload: data }));
      },
      setFirstVisit: (isFirst: boolean) => {
        set((state) => appReducer(state, { type: 'SET_FIRST_VISIT', payload: isFirst }));
      },
      getAnomaliesById: (id: string) => {
        return get().anomalies.find((a) => a.id === id);
      },
      getProcessingRecordsByAnomalyId: (anomalyId: string) => {
        return get().processingRecords.filter((pr) => pr.anomalyId === anomalyId);
      },
      getHistoryLogsByTargetId: (targetId: string) => {
        return get().historyLogs.filter((log) => log.targetId === targetId);
      },
    }),
    {
      name: 'port-yard-storage',
      partialize: (state) => ({
        containers: state.containers,
        anomalies: state.anomalies,
        processingRecords: state.processingRecords,
        historyLogs: state.historyLogs,
        cameraStates: state.cameraStates,
        isFirstVisit: state.isFirstVisit,
      }),
    }
  )
);
