import { create } from 'zustand';
import type { StatePoint, Process, Anomaly, HistoryEntry, ProcessType } from '../types';
import { calculateProcess, calculateCycle } from '../engine/thermodynamics';
import { validateAll } from '../engine/validator';

interface ThermoState {
  statePoints: StatePoint[];
  processes: Process[];
  anomalies: Anomaly[];
  history: HistoryEntry[];
  selectedPointId: string | null;
  selectedProcessId: string | null;
  substanceAmount: number;
  gamma: number;
  polytropicN: number;
  degreesOfFreedom: number;
  addStatePoint: (point: Omit<StatePoint, 'id' | 'createdAt' | 'updatedAt'>, source?: string) => void;
  updateStatePoint: (id: string, updates: Partial<StatePoint>, source?: string) => void;
  deleteStatePoint: (id: string, source?: string) => void;
  addProcess: (process: Omit<Process, 'id' | 'W' | 'Q' | 'deltaU' | 'createdAt'>, source?: string) => void;
  updateProcess: (id: string, updates: Partial<Process>, source?: string) => void;
  deleteProcess: (id: string, source?: string) => void;
  recalculateAll: () => void;
  setSelectedPoint: (id: string | null) => void;
  setSelectedProcess: (id: string | null) => void;
  clearAll: () => void;
  undo: () => void;
  loadExample: () => void;
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getNextLabel(existingLabels: string[]): string {
  const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const label of labels) {
    if (!existingLabels.includes(label)) {
      return label;
    }
  }
  return `Point${existingLabels.length + 1}`;
}

export const useThermoStore = create<ThermoState>((set, get) => ({
  statePoints: [],
  processes: [],
  anomalies: [],
  history: [],
  selectedPointId: null,
  selectedProcessId: null,
  substanceAmount: 1,
  gamma: 1.4,
  polytropicN: 1.3,
  degreesOfFreedom: 5,

  addStatePoint: (point, source) => {
    const state = get();
    const newPoint: StatePoint = {
      ...point,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const newPoints = [...state.statePoints, newPoint];
    const newProcesses = [...state.processes];
    const anomalies = validateAll(newPoints, newProcesses, state.substanceAmount);

    set({
      statePoints: newPoints,
      anomalies,
      history: [
        ...state.history,
        {
          id: generateId(),
          action: `添加状态点 ${newPoint.label}`,
          type: 'create',
          before: null,
          after: newPoint,
          source,
          timestamp: Date.now(),
        },
      ],
    });
    get().recalculateAll();
  },

  updateStatePoint: (id, updates, source) => {
    const state = get();
    const pointIndex = state.statePoints.findIndex(p => p.id === id);
    if (pointIndex === -1) return;

    const oldPoint = state.statePoints[pointIndex];
    const newPoint = { ...oldPoint, ...updates, updatedAt: Date.now() };
    const newPoints = [...state.statePoints];
    newPoints[pointIndex] = newPoint;

    const anomalies = validateAll(newPoints, state.processes, state.substanceAmount);

    set({
      statePoints: newPoints,
      anomalies,
      history: [
        ...state.history,
        {
          id: generateId(),
          action: `更新状态点 ${oldPoint.label}`,
          type: 'update',
          before: oldPoint,
          after: newPoint,
          source,
          timestamp: Date.now(),
        },
      ],
    });
    get().recalculateAll();
  },

  deleteStatePoint: (id, source) => {
    const state = get();
    const point = state.statePoints.find(p => p.id === id);
    if (!point) return;

    const newPoints = state.statePoints.filter(p => p.id !== id);
    const newProcesses = state.processes.filter(p => p.from !== id && p.to !== id);
    const anomalies = validateAll(newPoints, newProcesses, state.substanceAmount);

    set({
      statePoints: newPoints,
      processes: newProcesses,
      anomalies,
      selectedPointId: state.selectedPointId === id ? null : state.selectedPointId,
      history: [
        ...state.history,
        {
          id: generateId(),
          action: `删除状态点 ${point.label}`,
          type: 'delete',
          before: point,
          after: null,
          source,
          timestamp: Date.now(),
        },
      ],
    });
    get().recalculateAll();
  },

  addProcess: (processData, source) => {
    const state = get();
    const fromPoint = state.statePoints.find(p => p.id === processData.from);
    const toPoint = state.statePoints.find(p => p.id === processData.to);
    if (!fromPoint || !toPoint) return;

    const result = calculateProcess(
      processData.type,
      fromPoint,
      toPoint,
      state.substanceAmount,
      state.gamma,
      state.polytropicN,
      state.degreesOfFreedom
    );

    const newProcess: Process = {
      ...processData,
      id: generateId(),
      W: result.W,
      Q: result.Q,
      deltaU: result.deltaU,
      createdAt: Date.now(),
    };

    const newProcesses = [...state.processes, newProcess];
    const anomalies = validateAll(state.statePoints, newProcesses, state.substanceAmount);

    set({
      processes: newProcesses,
      anomalies,
      history: [
        ...state.history,
        {
          id: generateId(),
          action: `添加过程 ${fromPoint.label}→${toPoint.label}`,
          type: 'create',
          before: null,
          after: newProcess,
          source,
          timestamp: Date.now(),
        },
      ],
    });
  },

  updateProcess: (id, updates, source) => {
    const state = get();
    const processIndex = state.processes.findIndex(p => p.id === id);
    if (processIndex === -1) return;

    const oldProcess = state.processes[processIndex];
    const fromPoint = state.statePoints.find(p => p.id === oldProcess.from);
    const toPoint = state.statePoints.find(p => p.id === oldProcess.to);
    if (!fromPoint || !toPoint) return;

    const newType = (updates.type as ProcessType) || oldProcess.type;
    const result = calculateProcess(
      newType,
      fromPoint,
      toPoint,
      state.substanceAmount,
      state.gamma,
      state.polytropicN,
      state.degreesOfFreedom
    );

    const newProcess = {
      ...oldProcess,
      ...updates,
      type: newType,
      W: result.W,
      Q: result.Q,
      deltaU: result.deltaU,
    };

    const newProcesses = [...state.processes];
    newProcesses[processIndex] = newProcess;
    const anomalies = validateAll(state.statePoints, newProcesses, state.substanceAmount);

    set({
      processes: newProcesses,
      anomalies,
      history: [
        ...state.history,
        {
          id: generateId(),
          action: `更新过程 ${fromPoint.label}→${toPoint.label}`,
          type: 'update',
          before: oldProcess,
          after: newProcess,
          source,
          timestamp: Date.now(),
        },
      ],
    });
  },

  deleteProcess: (id, source) => {
    const state = get();
    const process = state.processes.find(p => p.id === id);
    if (!process) return;

    const fromPoint = state.statePoints.find(p => p.id === process.from);
    const toPoint = state.statePoints.find(p => p.id === process.to);

    const newProcesses = state.processes.filter(p => p.id !== id);
    const anomalies = validateAll(state.statePoints, newProcesses, state.substanceAmount);

    set({
      processes: newProcesses,
      anomalies,
      selectedProcessId: state.selectedProcessId === id ? null : state.selectedProcessId,
      history: [
        ...state.history,
        {
          id: generateId(),
          action: `删除过程 ${fromPoint?.label || '?'}→${toPoint?.label || '?'}`,
          type: 'delete',
          before: process,
          after: null,
          source,
          timestamp: Date.now(),
        },
      ],
    });
  },

  recalculateAll: () => {
    const state = get();
    const newProcesses = state.processes.map(process => {
      const fromPoint = state.statePoints.find(p => p.id === process.from);
      const toPoint = state.statePoints.find(p => p.id === process.to);
      if (!fromPoint || !toPoint) return process;

      const result = calculateProcess(
        process.type,
        fromPoint,
        toPoint,
        state.substanceAmount,
        state.gamma,
        state.polytropicN,
        state.degreesOfFreedom
      );

      return {
        ...process,
        W: result.W,
        Q: result.Q,
        deltaU: result.deltaU,
      };
    });

    const anomalies = validateAll(state.statePoints, newProcesses, state.substanceAmount);

    set({
      processes: newProcesses,
      anomalies,
    });
  },

  setSelectedPoint: (id) => set({ selectedPointId: id, selectedProcessId: null }),
  setSelectedProcess: (id) => set({ selectedProcessId: id, selectedPointId: null }),

  clearAll: () => {
    set({
      statePoints: [],
      processes: [],
      anomalies: [],
      history: [],
      selectedPointId: null,
      selectedProcessId: null,
    });
  },

  undo: () => {
    // Simple undo - just clear to initial state for now
    // In a more complex implementation, we would revert the last action
  },

  loadExample: () => {
    const now = Date.now();
    const examplePoints: StatePoint[] = [
      { id: 'p1', label: 'A', P: 2e5, V: 0.01, T: 240.56, n: 1, source: '示例数据-卡诺循环', createdAt: now, updatedAt: now },
      { id: 'p2', label: 'B', P: 1e5, V: 0.02, T: 240.56, n: 1, source: '示例数据-卡诺循环', createdAt: now, updatedAt: now },
      { id: 'p3', label: 'C', P: 3.79e4, V: 0.04, T: 181.7, n: 1, source: '示例数据-卡诺循环', createdAt: now, updatedAt: now },
      { id: 'p4', label: 'D', P: 7.58e4, V: 0.02, T: 181.7, n: 1, source: '示例数据-卡诺循环', createdAt: now, updatedAt: now },
    ];

    const exampleProcesses: Process[] = [
      {
        id: 'proc1', from: 'p1', to: 'p2', type: 'isothermal',
        W: 1386, Q: 1386, deltaU: 0, source: '示例数据', createdAt: now,
      },
      {
        id: 'proc2', from: 'p2', to: 'p3', type: 'adiabatic', gamma: 1.4,
        W: 1221, Q: 0, deltaU: -1221, source: '示例数据', createdAt: now,
      },
      {
        id: 'proc3', from: 'p3', to: 'p4', type: 'isothermal',
        W: -1047, Q: -1047, deltaU: 0, source: '示例数据', createdAt: now,
      },
      {
        id: 'proc4', from: 'p4', to: 'p1', type: 'adiabatic', gamma: 1.4,
        W: -1221, Q: 0, deltaU: 1221, source: '示例数据', createdAt: now,
      },
    ];

    const anomalies = validateAll(examplePoints, exampleProcesses, 1);

    set({
      statePoints: examplePoints,
      processes: exampleProcesses,
      anomalies,
      history: [
        {
          id: generateId(),
          action: '加载示例数据（卡诺循环）',
          type: 'import',
          before: null,
          after: { points: examplePoints, processes: exampleProcesses },
          source: '内置示例',
          timestamp: now,
        },
      ],
      selectedPointId: null,
      selectedProcessId: null,
    });
  },
}));

export function useCycleResult() {
  const { processes, statePoints } = useThermoStore();
  if (processes.length === 0) return null;

  const cycle = calculateCycle(processes);
  const firstPoint = statePoints.find(p => p.id === processes[0]?.from);
  const lastPoint = statePoints.find(p => p.id === processes[processes.length - 1]?.to);
  const isClosed = firstPoint && lastPoint &&
    Math.abs(firstPoint.P - lastPoint.P) < 1 &&
    Math.abs(firstPoint.V - lastPoint.V) < 1e-10 &&
    Math.abs(firstPoint.T - lastPoint.T) < 0.1;

  return { ...cycle, isClosed: !!isClosed };
}
