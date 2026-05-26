import { create } from 'zustand';
import type { SimulationResult, SimulationEvent, TacticsScheme } from '../engine/types';
import { runSimulation } from '../engine/simulation';
import { saveSimulationResult, loadSimulationResult } from '../utils/storage';

interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  currentTime: number;
  speed: number;
  result: SimulationResult | null;
  currentFrameIndex: number;
  activeEvents: SimulationEvent[];
  showingEvents: Set<string>;

  startSimulation: (scheme: TacticsScheme) => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  stopSimulation: () => void;
  setSpeed: (speed: number) => void;
  setCurrentFrame: (index: number) => void;
  addShowingEvent: (eventId: string) => void;
  removeShowingEvent: (eventId: string) => void;
  clearResult: () => void;
  loadResult: (schemeId: string) => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  isRunning: false,
  isPaused: false,
  currentTime: 0,
  speed: 1,
  result: null,
  currentFrameIndex: 0,
  activeEvents: [],
  showingEvents: new Set(),

  startSimulation: (scheme) => {
    const result = runSimulation(scheme);
    saveSimulationResult(result);
    set({
      isRunning: true,
      isPaused: false,
      currentTime: 0,
      result,
      currentFrameIndex: 0,
      activeEvents: [],
      showingEvents: new Set(),
    });
  },

  pauseSimulation: () => {
    set({ isPaused: true });
  },

  resumeSimulation: () => {
    set({ isPaused: false });
  },

  stopSimulation: () => {
    set({
      isRunning: false,
      isPaused: false,
      currentTime: 0,
      currentFrameIndex: 0,
      activeEvents: [],
    });
  },

  setSpeed: (speed) => {
    set({ speed });
  },

  setCurrentFrame: (index) => {
    const { result } = get();
    if (!result) return;
    const clampedIndex = Math.max(0, Math.min(result.frames.length - 1, index));
    const frame = result.frames[clampedIndex];
    const activeEvents = result.events.filter(
      (e) => Math.abs(e.time - frame.time) < 0.1
    );
    set({
      currentFrameIndex: clampedIndex,
      currentTime: frame.time,
      activeEvents,
    });
  },

  addShowingEvent: (eventId) => {
    const { showingEvents } = get();
    const newSet = new Set(showingEvents);
    newSet.add(eventId);
    set({ showingEvents: newSet });
  },

  removeShowingEvent: (eventId) => {
    const { showingEvents } = get();
    const newSet = new Set(showingEvents);
    newSet.delete(eventId);
    set({ showingEvents: newSet });
  },

  clearResult: () => {
    set({
      isRunning: false,
      isPaused: false,
      currentTime: 0,
      result: null,
      currentFrameIndex: 0,
      activeEvents: [],
      showingEvents: new Set(),
    });
  },

  loadResult: (schemeId) => {
    const result = loadSimulationResult(schemeId);
    if (result) {
      set({ result, currentFrameIndex: 0, currentTime: 0 });
    }
  },
}));
