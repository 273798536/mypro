import { create } from 'zustand';
import { ExperimentData, Measurement, HistoryRecord, CalculationResult, TabType } from '../types';
import { calculateSoundSpeed, calculateTheoreticalSpeed, calculateRelativeError } from '../utils/soundSpeed';
import { generateWarnings, calculateErrorBreakdown } from '../utils/errorAnalysis';

interface ExperimentState {
  experiments: ExperimentData[];
  currentExperimentId: string | null;
  history: HistoryRecord[];
  activeTab: TabType;
  excludeOutliers: boolean;
  temperatureCorrection: boolean;

  setExperiments: (experiments: ExperimentData[]) => void;
  setCurrentExperiment: (id: string | null) => void;
  addExperiment: (experiment: ExperimentData) => void;
  updateExperiment: (id: string, updates: Partial<ExperimentData>) => void;
  deleteExperiment: (id: string) => void;
  addMeasurement: (experimentId: string, measurement: Measurement) => void;
  updateMeasurement: (experimentId: string, measurementId: string, updates: Partial<Measurement>) => void;
  deleteMeasurement: (experimentId: string, measurementId: string) => void;
  addHistoryRecord: (record: HistoryRecord) => void;
  setActiveTab: (tab: TabType) => void;
  setExcludeOutliers: (value: boolean) => void;
  setTemperatureCorrection: (value: boolean) => void;
  getCurrentExperiment: () => ExperimentData | null;
  calculateResult: () => CalculationResult | null;
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

export const useExperimentStore = create<ExperimentState>((set, get) => ({
  experiments: [],
  currentExperimentId: null,
  history: [],
  activeTab: 'data',
  excludeOutliers: true,
  temperatureCorrection: true,

  setExperiments: (experiments) => set({ experiments }),
  setCurrentExperiment: (id) => set({ currentExperimentId: id }),

  addExperiment: (experiment) =>
    set((state) => ({
      experiments: [...state.experiments, experiment],
      currentExperimentId: state.currentExperimentId || experiment.id,
    })),

  updateExperiment: (id, updates) =>
    set((state) => ({
      experiments: state.experiments.map((exp) =>
        exp.id === id ? { ...exp, ...updates, updatedAt: new Date().toISOString() } : exp
      ),
    })),

  deleteExperiment: (id) =>
    set((state) => ({
      experiments: state.experiments.filter((exp) => exp.id !== id),
      currentExperimentId: state.currentExperimentId === id ? null : state.currentExperimentId,
    })),

  addMeasurement: (experimentId, measurement) =>
    set((state) => ({
      experiments: state.experiments.map((exp) =>
        exp.id === experimentId
          ? { ...exp, measurements: [...exp.measurements, measurement], updatedAt: new Date().toISOString() }
          : exp
      ),
    })),

  updateMeasurement: (experimentId, measurementId, updates) =>
    set((state) => ({
      experiments: state.experiments.map((exp) =>
        exp.id === experimentId
          ? {
              ...exp,
              measurements: exp.measurements.map((m) =>
                m.id === measurementId ? { ...m, ...updates } : m
              ),
              updatedAt: new Date().toISOString(),
            }
          : exp
      ),
    })),

  deleteMeasurement: (experimentId, measurementId) =>
    set((state) => ({
      experiments: state.experiments.map((exp) =>
        exp.id === experimentId
          ? {
              ...exp,
              measurements: exp.measurements.filter((m) => m.id !== measurementId),
              updatedAt: new Date().toISOString(),
            }
          : exp
      ),
    })),

  addHistoryRecord: (record) =>
    set((state) => ({
      history: [record, ...state.history],
    })),

  setActiveTab: (tab) => set({ activeTab: tab }),
  setExcludeOutliers: (value) => set({ excludeOutliers: value }),
  setTemperatureCorrection: (value) => set({ temperatureCorrection: value }),

  getCurrentExperiment: () => {
    const { experiments, currentExperimentId } = get();
    return experiments.find((exp) => exp.id === currentExperimentId) || null;
  },

  calculateResult: () => {
    const exp = get().getCurrentExperiment();
    if (!exp) return null;

    const { excludeOutliers } = get();

    const { speed, fitResult } = calculateSoundSpeed(
      exp.measurements,
      exp.frequency,
      exp.temperature,
      excludeOutliers
    );

    const theoreticalSpeed = calculateTheoreticalSpeed(exp.temperature);
    const relativeError = calculateRelativeError(speed, theoreticalSpeed);

    const warnings = generateWarnings(exp.measurements, exp.temperature);
    const errorBreakdown = calculateErrorBreakdown(
      exp.measurements,
      exp.frequency,
      exp.temperature,
      fitResult.rSquared
    );

    return {
      soundSpeed: speed,
      theoreticalSpeed,
      relativeError,
      linearFitResult: fitResult,
      errorBreakdown,
      warnings,
    };
  },

  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem('soundSpeedExperiments');
      if (stored) {
        const data = JSON.parse(stored);
        set({
          experiments: data.experiments || [],
          history: data.history || [],
        });
      }
    } catch (e) {
      console.error('Failed to load from storage', e);
    }
  },

  saveToStorage: () => {
    try {
      const { experiments, history } = get();
      localStorage.setItem(
        'soundSpeedExperiments',
        JSON.stringify({ experiments, history })
      );
    } catch (e) {
      console.error('Failed to save to storage', e);
    }
  },
}));
