import { create } from 'zustand';
import type { PlaybackState } from '../types/acoustics';

interface PlaybackStore extends PlaybackState {
  keyframes: number[];
  currentFrame: number;
  totalFrames: number;
  setPlaying: (playing: boolean) => void;
  togglePlaying: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setSpeed: (speed: number) => void;
  setKeyframes: (frames: number[]) => void;
  setTotalFrames: (frames: number) => void;
  setCurrentFrame: (frame: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
  jumpToKeyframe: (index: number) => void;
  reset: () => void;
}

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 3,
  speed: 1,
  keyframes: [],
  currentFrame: 0,
  totalFrames: 180,

  setPlaying: (playing) => set({ isPlaying: playing }),
  togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setCurrentTime: (time) =>
    set((state) => ({
      currentTime: Math.max(0, Math.min(time, state.duration)),
    })),

  setDuration: (duration) => set({ duration }),
  setSpeed: (speed) => set({ speed }),
  setKeyframes: (frames) => set({ keyframes: frames }),
  setTotalFrames: (frames) => set({ totalFrames: frames }),

  setCurrentFrame: (frame) =>
    set((state) => {
      const clamped = Math.max(0, Math.min(frame, state.totalFrames));
      const time = (clamped / state.totalFrames) * state.duration;
      return { currentFrame: clamped, currentTime: time };
    }),

  stepForward: () => {
    const { currentFrame, totalFrames } = get();
    get().setCurrentFrame(Math.min(currentFrame + 1, totalFrames));
  },

  stepBackward: () => {
    const { currentFrame } = get();
    get().setCurrentFrame(Math.max(currentFrame - 1, 0));
  },

  jumpToKeyframe: (index) => {
    const { keyframes } = get();
    if (keyframes[index] !== undefined) {
      get().setCurrentTime(keyframes[index]);
    }
  },

  reset: () =>
    set({
      isPlaying: false,
      currentTime: 0,
      currentFrame: 0,
    }),
}));
