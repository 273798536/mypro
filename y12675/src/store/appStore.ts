import { create } from 'zustand';
import type { 
  PointCloudData, 
  MeasurementRecord, 
  CollisionEvent, 
  TimeState, 
  SlicePlane,
  CrystalDefect
} from '../types';

interface AppStore {
  pointCloudData: PointCloudData | null;
  measurements: MeasurementRecord[];
  collisions: CollisionEvent[];
  timeState: TimeState;
  slicePlane: SlicePlane;
  selectedDefects: string[];
  history: {
    past: PointCloudData[];
    future: PointCloudData[];
  };
  
  setPointCloudData: (data: PointCloudData) => void;
  importData: (data: PointCloudData) => void;
  clearData: () => void;
  
  addMeasurement: (measurement: MeasurementRecord) => void;
  removeMeasurement: (id: string) => void;
  updateMeasurement: (id: string, updates: Partial<MeasurementRecord>) => void;
  
  addCollision: (collision: CollisionEvent) => void;
  clearCollisions: () => void;
  
  setTimeState: (updates: Partial<TimeState>) => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
  setTime: (time: number) => void;
  
  setSlicePlane: (updates: Partial<SlicePlane>) => void;
  
  selectDefect: (id: string) => void;
  deselectDefect: (id: string) => void;
  clearSelection: () => void;
  
  pushHistory: (data: PointCloudData) => void;
  undo: () => void;
  redo: () => void;
  
  getDefectsAtTime: (time: number) => CrystalDefect[];
}

export const useAppStore = create<AppStore>((set, get) => ({
  pointCloudData: null,
  measurements: [],
  collisions: [],
  timeState: {
    currentTime: 0,
    totalDuration: 100,
    isPlaying: false,
    playbackSpeed: 1,
  },
  slicePlane: {
    normal: { x: 0, y: 1, z: 0 },
    distance: 0,
    active: true,
  },
  selectedDefects: [],
  history: {
    past: [],
    future: [],
  },

  setPointCloudData: (data) => set({ pointCloudData: data }),

  importData: (data) => {
    const currentData = get().pointCloudData;
    if (currentData) {
      set((state) => ({
        pointCloudData: data,
        history: {
          past: [...state.history.past, currentData],
          future: [],
        },
      }));
    } else {
      set({ pointCloudData: data });
    }
  },

  clearData: () => set({
    pointCloudData: null,
    measurements: [],
    collisions: [],
    timeState: {
      currentTime: 0,
      totalDuration: 100,
      isPlaying: false,
      playbackSpeed: 1,
    },
    selectedDefects: [],
  }),

  addMeasurement: (measurement) => set((state) => ({
    measurements: [...state.measurements, measurement],
  })),

  removeMeasurement: (id) => set((state) => ({
    measurements: state.measurements.filter((m) => m.id !== id),
  })),

  updateMeasurement: (id, updates) => set((state) => ({
    measurements: state.measurements.map((m) =>
      m.id === id ? { ...m, ...updates } : m
    ),
  })),

  addCollision: (collision) => set((state) => ({
    collisions: [...state.collisions, collision],
  })),

  clearCollisions: () => set({ collisions: [] }),

  setTimeState: (updates) => set((state) => ({
    timeState: { ...state.timeState, ...updates },
  })),

  play: () => set((state) => ({
    timeState: { ...state.timeState, isPlaying: true },
  })),

  pause: () => set((state) => ({
    timeState: { ...state.timeState, isPlaying: false },
  })),

  reset: () => set((state) => ({
    timeState: { ...state.timeState, currentTime: 0, isPlaying: false },
  })),

  setTime: (time) => set((state) => ({
    timeState: { ...state.timeState, currentTime: Math.max(0, Math.min(time, state.timeState.totalDuration)) },
  })),

  setSlicePlane: (updates) => set((state) => ({
    slicePlane: { ...state.slicePlane, ...updates },
  })),

  selectDefect: (id) => set((state) => ({
    selectedDefects: state.selectedDefects.includes(id)
      ? state.selectedDefects
      : [...state.selectedDefects, id],
  })),

  deselectDefect: (id) => set((state) => ({
    selectedDefects: state.selectedDefects.filter((d) => d !== id),
  })),

  clearSelection: () => set({ selectedDefects: [] }),

  pushHistory: (data) => set((state) => ({
    history: {
      past: [...state.history.past, data].slice(-50),
      future: [],
    },
  })),

  undo: () => set((state) => {
    if (state.history.past.length === 0) return state;
    const previous = state.history.past[state.history.past.length - 1];
    const newPast = state.history.past.slice(0, -1);
    return {
      pointCloudData: previous,
      history: {
        past: newPast,
        future: state.pointCloudData ? [state.pointCloudData, ...state.history.future] : state.history.future,
      },
    };
  }),

  redo: () => set((state) => {
    if (state.history.future.length === 0) return state;
    const next = state.history.future[0];
    const newFuture = state.history.future.slice(1);
    return {
      pointCloudData: next,
      history: {
        past: state.pointCloudData ? [...state.history.past, state.pointCloudData] : state.history.past,
        future: newFuture,
      },
    };
  }),

  getDefectsAtTime: (time) => {
    const data = get().pointCloudData;
    if (!data) return [];
    return data.points.filter((defect) => defect.timestamp <= time);
  },
}));
