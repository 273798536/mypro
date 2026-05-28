import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AnalysisRecord, Direction, Anomaly, Correction, FrequencyPeak, AudioData, FFTSpectrum } from '../types';

interface AnalysisState {
  currentRecord: AnalysisRecord | null;
  history: AnalysisRecord[];
  audioData: AudioData | null;
  spectrum: FFTSpectrum | null;
  isAnalyzing: boolean;
  parameters: {
    baseFrequency: number;
    sampleRate: number;
    direction: Direction;
    noiseThreshold: number;
  };
  
  setAudioData: (data: AudioData | null) => void;
  setSpectrum: (spectrum: FFTSpectrum | null) => void;
  setParameters: (params: Partial<AnalysisState['parameters']>) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setCurrentRecord: (record: AnalysisRecord | null) => void;
  
  createNewRecord: (source: AnalysisRecord['source']) => string;
  updateRecordResults: (id: string, results: AnalysisRecord['results']) => void;
  addAnomaly: (id: string, anomaly: Anomaly) => void;
  addCorrection: (id: string, correction: Correction) => void;
  updateRecordStatus: (id: string, status: AnalysisRecord['status']) => void;
  
  saveToHistory: (record: AnalysisRecord) => void;
  loadFromHistory: (id: string) => AnalysisRecord | undefined;
  deleteFromHistory: (id: string) => void;
  clearHistory: () => void;
  
  resetAnalysis: () => void;
}

const defaultParameters = {
  baseFrequency: 1000,
  sampleRate: 44100,
  direction: 'approaching' as Direction,
  noiseThreshold: 0.3
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set, get) => ({
      currentRecord: null,
      history: [],
      audioData: null,
      spectrum: null,
      isAnalyzing: false,
      parameters: defaultParameters,

      setAudioData: (data) => set({ audioData: data }),
      setSpectrum: (spectrum) => set({ spectrum }),
      setParameters: (params) => set((state) => ({
        parameters: { ...state.parameters, ...params }
      })),
      setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
      setCurrentRecord: (record) => set({ currentRecord: record }),

      createNewRecord: (source) => {
        const now = Date.now();
        const newRecord: AnalysisRecord = {
          id: generateId(),
          createdAt: now,
          updatedAt: now,
          source,
          parameters: { ...get().parameters },
          results: {
            observedFrequency: 0,
            frequencyShift: 0,
            velocity: 0,
            confidence: 0,
            peaks: []
          },
          anomalies: [],
          corrections: [],
          status: 'pending'
        };
        set({ currentRecord: newRecord });
        return newRecord.id;
      },

      updateRecordResults: (id, results) => set((state) => {
        if (state.currentRecord?.id === id) {
          return {
            currentRecord: {
              ...state.currentRecord,
              results,
              updatedAt: Date.now()
            }
          };
        }
        return {};
      }),

      addAnomaly: (id, anomaly) => set((state) => {
        if (state.currentRecord?.id === id) {
          return {
            currentRecord: {
              ...state.currentRecord,
              anomalies: [...state.currentRecord.anomalies, anomaly],
              updatedAt: Date.now()
            }
          };
        }
        return {};
      }),

      addCorrection: (id, correction) => set((state) => {
        if (state.currentRecord?.id === id) {
          return {
            currentRecord: {
              ...state.currentRecord,
              corrections: [...state.currentRecord.corrections, correction],
              updatedAt: Date.now()
            }
          };
        }
        return {};
      }),

      updateRecordStatus: (id, status) => set((state) => {
        if (state.currentRecord?.id === id) {
          return {
            currentRecord: {
              ...state.currentRecord,
              status,
              updatedAt: Date.now()
            }
          };
        }
        return {};
      }),

      saveToHistory: (record) => set((state) => {
        const existingIndex = state.history.findIndex(r => r.id === record.id);
        const newHistory = existingIndex >= 0
          ? [...state.history.slice(0, existingIndex), record, ...state.history.slice(existingIndex + 1)]
          : [record, ...state.history];
        return { history: newHistory.slice(0, 100) };
      }),

      loadFromHistory: (id) => {
        const record = get().history.find(r => r.id === id);
        if (record) {
          set({ currentRecord: record, parameters: record.parameters });
        }
        return record;
      },

      deleteFromHistory: (id) => set((state) => ({
        history: state.history.filter(r => r.id !== id)
      })),

      clearHistory: () => set({ history: [] }),

      resetAnalysis: () => set({
        currentRecord: null,
        audioData: null,
        spectrum: null,
        isAnalyzing: false,
        parameters: defaultParameters
      })
    }),
    {
      name: 'doppler-analysis-storage',
      partialize: (state) => ({
        history: state.history,
        parameters: state.parameters
      })
    }
  )
);

export function createAnomaly(
  type: Anomaly['type'],
  severity: Anomaly['severity'],
  message: string,
  suggestion: string
): Anomaly {
  return {
    type,
    severity,
    message,
    suggestion,
    timestamp: Date.now()
  };
}

export function createCorrection(
  field: string,
  oldValue: number | string,
  newValue: number | string,
  reason: string
): Correction {
  return {
    field,
    oldValue,
    newValue,
    reason,
    timestamp: Date.now()
  };
}
