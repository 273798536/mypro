import { create } from 'zustand';
import type { WaveSource, Obstacle, Warning, SimulationState, ViewMode } from '../types';
import { GRID_WIDTH, GRID_HEIGHT } from '../utils/wavePhysics';

interface SimulationStore {
  sources: WaveSource[];
  obstacles: Obstacle[];
  warnings: Warning[];
  simulation: SimulationState;
  viewMode: ViewMode;
  frameTimes: number[];

  addSource: (source: Omit<WaveSource, 'id'>) => void;
  updateSource: (id: string, updates: Partial<WaveSource>) => void;
  removeSource: (id: string) => void;

  addObstacle: (obstacle: Omit<Obstacle, 'id'>) => void;
  updateObstacle: (id: string, updates: Partial<Obstacle>) => void;
  removeObstacle: (id: string) => void;

  addWarning: (warning: Omit<Warning, 'id' | 'timestamp' | 'dismissed'>) => void;
  dismissWarning: (id: string) => void;
  clearWarnings: () => void;

  setWaveData: (data: Float32Array) => void;
  setPlaying: (playing: boolean) => void;
  setTime: (time: number) => void;
  setSpeed: (speed: number) => void;
  setViewMode: (mode: ViewMode) => void;
  addFrameTime: (time: number) => void;
  clearFrameTimes: () => void;

  saveBaseline: () => void;
  toggleComparison: () => void;

  resetSimulation: () => void;
}

const initialSources: WaveSource[] = [
  {
    id: 'source-1',
    x: 30,
    y: 50,
    frequency: 2,
    phase: 0,
    amplitude: 1,
    enabled: true,
  },
  {
    id: 'source-2',
    x: 70,
    y: 50,
    frequency: 2,
    phase: Math.PI,
    amplitude: 1,
    enabled: true,
  },
];

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  sources: initialSources,
  obstacles: [],
  warnings: [],
  simulation: {
    isPlaying: true,
    time: 0,
    speed: 1,
    gridSize: { width: GRID_WIDTH, height: GRID_HEIGHT },
    waveData: null,
    previousWaveData: null,
    baselineWaveData: null,
    showComparison: false,
  },
  viewMode: '3d',
  frameTimes: [],

  addSource: (source) =>
    set((state) => ({
      sources: [...state.sources, { ...source, id: `source-${Date.now()}` }],
    })),

  updateSource: (id, updates) =>
    set((state) => ({
      sources: state.sources.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),

  removeSource: (id) =>
    set((state) => ({
      sources: state.sources.filter((s) => s.id !== id),
    })),

  addObstacle: (obstacle) =>
    set((state) => ({
      obstacles: [...state.obstacles, { ...obstacle, id: `obs-${Date.now()}` }],
    })),

  updateObstacle: (id, updates) =>
    set((state) => ({
      obstacles: state.obstacles.map((o) =>
        o.id === id ? { ...o, ...updates } : o
      ),
    })),

  removeObstacle: (id) =>
    set((state) => ({
      obstacles: state.obstacles.filter((o) => o.id !== id),
    })),

  addWarning: (warning) =>
    set((state) => {
      const exists = state.warnings.find((w) => w.type === warning.type);
      if (exists) return state;
      return {
        warnings: [
          ...state.warnings,
          {
            ...warning,
            id: `warning-${Date.now()}`,
            timestamp: Date.now(),
            dismissed: false,
          },
        ],
      };
    }),

  dismissWarning: (id) =>
    set((state) => ({
      warnings: state.warnings.map((w) =>
        w.id === id ? { ...w, dismissed: true } : w
      ),
    })),

  clearWarnings: () => set({ warnings: [] }),

  setWaveData: (data) =>
    set((state) => ({
      simulation: {
        ...state.simulation,
        previousWaveData: state.simulation.waveData,
        waveData: data,
      },
    })),

  setPlaying: (isPlaying) =>
    set((state) => ({
      simulation: { ...state.simulation, isPlaying },
    })),

  setTime: (time) =>
    set((state) => ({
      simulation: { ...state.simulation, time },
    })),

  setSpeed: (speed) =>
    set((state) => ({
      simulation: { ...state.simulation, speed },
    })),

  setViewMode: (viewMode) => set({ viewMode }),

  addFrameTime: (time) =>
    set((state) => ({
      frameTimes: [...state.frameTimes.slice(-20), time],
    })),

  clearFrameTimes: () => set({ frameTimes: [] }),

  saveBaseline: () =>
    set((state) => ({
      simulation: {
        ...state.simulation,
        baselineWaveData: state.simulation.waveData
          ? new Float32Array(state.simulation.waveData)
          : null,
      },
    })),

  toggleComparison: () =>
    set((state) => ({
      simulation: {
        ...state.simulation,
        showComparison: !state.simulation.showComparison,
      },
    })),

  resetSimulation: () =>
    set(() => ({
      simulation: {
        isPlaying: false,
        time: 0,
        speed: 1,
        gridSize: { width: GRID_WIDTH, height: GRID_HEIGHT },
        waveData: null,
        previousWaveData: null,
        baselineWaveData: null,
        showComparison: false,
      },
    })),
}));
