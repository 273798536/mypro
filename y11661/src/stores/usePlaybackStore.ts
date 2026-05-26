import { create } from 'zustand';
import type { PlaybackState } from '../types';

interface PlaybackStore extends PlaybackState {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  setSpeed: (speed: number) => void;
  setDuration: (duration: number) => void;
  setSelectedRobotId: (id: string | null) => void;
  reset: () => void;
  seek: (percent: number) => void;
}

const defaultState: PlaybackState = {
  isPlaying: false,
  currentTime: 0,
  speed: 1,
  duration: 0,
  selectedRobotId: null,
};

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  ...defaultState,

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setCurrentTime: (time) =>
    set((state) => ({
      currentTime: Math.max(0, Math.min(state.duration, time)),
    })),

  setSpeed: (speed) => set({ speed }),
  setDuration: (duration) => set({ duration }),
  setSelectedRobotId: (id) => set({ selectedRobotId: id }),

  reset: () =>
    set({
      ...defaultState,
      duration: get().duration,
    }),

  seek: (percent) => {
    const { duration } = get();
    set({
      currentTime: Math.max(0, Math.min(duration, duration * percent)),
    });
  },
}));
