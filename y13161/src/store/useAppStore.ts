import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AppStore,
  RawSensorLog,
  StandardizedData,
  Anomaly,
  AnalysisHistory,
  ParameterVersion,
  StorageKeys,
} from '@/types';
import { unitConversionRules } from '@/utils/units';
import { defaultThresholds } from '@/utils/thresholds';
import { detectAllAnomalies } from '@/utils/anomaly';

const defaultParameterVersion: ParameterVersion = {
  id: 'param_v1',
  version: '1.0.0',
  createdAt: new Date(),
  unitRules: unitConversionRules,
  thresholds: defaultThresholds,
};

const initialState: Omit<AppStore, keyof { [K in keyof AppStore as AppStore[K] extends Function ? K : never]: never }> = {
  rawLogs: [],
  standardizedData: [],
  anomalies: [],
  selectedAnomalyId: null,
  parameterVersion: defaultParameterVersion,
  history: [],
  currentHistoryId: null,
  isLoading: false,
  showGuide: false,
};

function serializeDates(obj: any): any {
  if (obj instanceof Date) {
    return { __type: 'Date', value: obj.toISOString() };
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeDates);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = serializeDates(obj[key]);
    }
    return result;
  }
  return obj;
}

function deserializeDates(obj: any): any {
  if (obj !== null && typeof obj === 'object' && obj.__type === 'Date') {
    return new Date(obj.value);
  }
  if (Array.isArray(obj)) {
    return obj.map(deserializeDates);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = deserializeDates(obj[key]);
    }
    return result;
  }
  return obj;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setRawLogs: (logs: RawSensorLog[]) => {
        set({ rawLogs: logs });
      },

      setStandardizedData: (data: StandardizedData[]) => {
        set({ standardizedData: data });
      },

      setAnomalies: (anomalies: Anomaly[]) => {
        set({ anomalies });
      },

      setSelectedAnomalyId: (id: string | null) => {
        set({ selectedAnomalyId: id });
      },

      addHistory: (record: AnalysisHistory) => {
        set((state) => ({
          history: [record, ...state.history].slice(0, 50),
          currentHistoryId: record.id,
        }));
      },

      setCurrentHistoryId: (id: string | null) => {
        set({ currentHistoryId: id });
      },

      loadHistory: (id: string) => {
        const state = get();
        const record = state.history.find((h) => h.id === id);
        if (record) {
          set({
            rawLogs: record.rawLogs,
            standardizedData: record.standardizedData,
            anomalies: record.anomalies,
            currentHistoryId: id,
            selectedAnomalyId: null,
          });
        }
      },

      reRunAnalysis: () => {
        const state = get();
        if (state.rawLogs.length === 0) return;

        set({ isLoading: true });

        setTimeout(() => {
          const { standardizedData, anomalies } = detectAllAnomalies(
            state.rawLogs,
            state.parameterVersion
          );

          const historyRecord: AnalysisHistory = {
            id: `hist_${Date.now()}`,
            timestamp: new Date(),
            sourceFile: '重跑分析',
            recordCount: state.rawLogs.length,
            anomalyCount: anomalies.length,
            parameterVersionId: state.parameterVersion.id,
            status: 'completed',
            rawLogs: state.rawLogs,
            standardizedData,
            anomalies,
          };

          set((s) => ({
            standardizedData,
            anomalies,
            history: [historyRecord, ...s.history].slice(0, 50),
            currentHistoryId: historyRecord.id,
            selectedAnomalyId: null,
            isLoading: false,
          }));
        }, 500);
      },

      setIsLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setShowGuide: (show: boolean) => {
        set({ showGuide: show });
      },

      confirmAnomaly: (id: string) => {
        set((state) => ({
          anomalies: state.anomalies.map((a) =>
            a.id === id ? { ...a, status: 'confirmed' } : a
          ),
        }));
      },

      dismissAnomaly: (id: string) => {
        set((state) => ({
          anomalies: state.anomalies.map((a) =>
            a.id === id ? { ...a, status: 'dismissed' } : a
          ),
        }));
      },

      reset: () => {
        set({
          ...initialState,
          history: get().history,
          parameterVersion: get().parameterVersion,
        });
      },
    }),
    {
      name: StorageKeys.CURRENT_STATE,
      partialize: (state) => ({
        history: state.history,
        parameterVersion: state.parameterVersion,
        showGuide: state.showGuide,
      }),
      serialize: (state) => JSON.stringify(serializeDates(state)),
      deserialize: (str) => deserializeDates(JSON.parse(str)),
    }
  )
);
