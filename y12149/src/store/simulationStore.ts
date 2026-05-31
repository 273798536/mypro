import { create } from 'zustand';
import { networkData } from '@/data/network';
import { valveActions, issues } from '@/data/valves';
import { generatePressureData } from '@/engine/waterHammer';
import { SimulationStore } from '@/types';

const DURATION = 20;
const pressureData = generatePressureData(DURATION, valveActions, networkData);

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  currentTime: 0,
  isPlaying: false,
  speed: 1,
  duration: DURATION,
  selectedIssueId: null,
  pausedForIssue: null,
  network: networkData,
  valveActions,
  pressureData,
  issues,
  hoveredElement: null,

  play: () => {
    set({ isPlaying: true });
  },

  pause: () => {
    set({ isPlaying: false });
  },

  setTime: (time: number) => {
    const clampedTime = Math.max(0, Math.min(time, DURATION));
    
    const state = get();
    const triggeredIssue = state.issues.find(
      issue => issue.timePoint > 0 && Math.abs(issue.timePoint - clampedTime) < 0.05
    );
    
    if (triggeredIssue && !state.pausedForIssue) {
      set({ 
        currentTime: clampedTime,
        isPlaying: false,
        pausedForIssue: triggeredIssue.id,
        selectedIssueId: triggeredIssue.id,
      });
    } else {
      set({ currentTime: clampedTime });
    }
  },

  setSpeed: (speed: number) => {
    set({ speed });
  },

  stepTime: (delta: number) => {
    const state = get();
    const newTime = Math.max(0, Math.min(state.duration, state.currentTime + delta));
    state.clearPausedIssue();
    set({ currentTime: newTime });
  },

  selectIssue: (id: string | null) => {
    if (id) {
      const issue = get().issues.find(i => i.id === id);
      if (issue && issue.timePoint > 0) {
        set({ 
          selectedIssueId: id, 
          currentTime: issue.timePoint,
          isPlaying: false,
        });
      } else {
        set({ selectedIssueId: id });
      }
    } else {
      set({ selectedIssueId: null });
    }
  },

  clearPausedIssue: () => {
    set({ pausedForIssue: null });
  },

  setHoveredElement: (element) => {
    set({ hoveredElement: element });
  },

  reset: () => {
    set({
      currentTime: 0,
      isPlaying: false,
      selectedIssueId: null,
      pausedForIssue: null,
      hoveredElement: null,
    });
  },
}));
