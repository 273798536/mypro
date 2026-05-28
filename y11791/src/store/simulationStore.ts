import { create } from 'zustand';
import type { SimulationParams, SimulationResult, ModificationRecord } from '../types/simulation';
import { runSimulation, validateParameters } from '../utils/physics';
import { generateId } from '../data/sampleData';

interface SimulationState {
  params: SimulationParams;
  result: SimulationResult | null;
  isRunning: boolean;
  history: SimulationParams[];
  
  setParam: (key: keyof SimulationParams, value: number | string, reason?: string) => void;
  setParams: (params: Partial<SimulationParams>, reason?: string) => void;
  runSimulation: () => void;
  resetSimulation: () => void;
  clearResult: () => void;
}

const defaultParams: SimulationParams = {
  id: generateId(),
  source: '手动输入',
  timestamp: Date.now(),
  radius: 1.5,
  airDensity: 1.225,
  dragCoefficient: 0.47,
  initialVelocity: 0,
  height: 1000,
  modificationHistory: [],
};

export const useSimulationStore = create<SimulationState>((set, get) => ({
  params: defaultParams,
  result: null,
  isRunning: false,
  history: [],

  setParam: (key, value, reason = '手动调整') => {
    const oldParams = get().params;
    const oldValue = oldParams[key as keyof SimulationParams];
    
    if (oldValue === value) return;

    const modification: ModificationRecord = {
      timestamp: Date.now(),
      field: key,
      oldValue: Number(oldValue),
      newValue: Number(value),
      reason,
    };

    set((state) => ({
      params: {
        ...state.params,
        [key]: value,
        modificationHistory: [...state.params.modificationHistory, modification],
      },
    }));
  },

  setParams: (newParams, reason = '批量更新') => {
    const oldParams = get().params;
    const modifications: ModificationRecord[] = [];

    for (const [key, value] of Object.entries(newParams)) {
      if (value !== undefined && oldParams[key as keyof SimulationParams] !== value) {
        modifications.push({
          timestamp: Date.now(),
          field: key,
          oldValue: Number(oldParams[key as keyof SimulationParams]),
          newValue: Number(value),
          reason,
        });
      }
    }

    set((state) => ({
      params: {
        ...state.params,
        ...newParams,
        id: generateId(),
        timestamp: Date.now(),
        modificationHistory: [...state.params.modificationHistory, ...modifications],
      },
    }));
  },

  runSimulation: () => {
    const { params, history } = get();
    set({ isRunning: true });

    const anomalies = validateParameters(params);
    const hasError = anomalies.some((a) => a.severity === 'error');

    if (hasError) {
      set({
        result: {
          timeSeries: [],
          velocitySeries: [],
          positionSeries: [],
          terminalVelocity: 0,
          timeToTerminal: 0,
          timeToGround: 0,
          anomalies,
          status: 'error',
        },
        isRunning: false,
      });
      return;
    }

    const result = runSimulation(params);

    set({
      result,
      isRunning: false,
      history: [...history.slice(-9), { ...params, id: generateId(), timestamp: Date.now() }],
    });
  },

  resetSimulation: () => {
    set({
      params: { ...defaultParams, id: generateId(), modificationHistory: [] },
      result: null,
      isRunning: false,
    });
  },

  clearResult: () => {
    set({ result: null });
  },
}));
