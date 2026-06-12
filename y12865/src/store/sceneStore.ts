import { create } from 'zustand';
import type { TrajectoryMode } from '@/types';

interface SceneState {
  trajectoryMode: TrajectoryMode;
  clippingEnabled: boolean;
  clippingHeight: number;
  selectedPointId: string | null;
  cameraPreset: 'perspective' | 'top' | 'front' | 'side';
  timelineProgress: number;
  setTrajectoryMode: (mode: TrajectoryMode) => void;
  setClippingEnabled: (enabled: boolean) => void;
  setClippingHeight: (height: number) => void;
  setSelectedPointId: (id: string | null) => void;
  setCameraPreset: (preset: SceneState['cameraPreset']) => void;
  setTimelineProgress: (progress: number | ((prev: number) => number)) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  trajectoryMode: 'both',
  clippingEnabled: false,
  clippingHeight: 10,
  selectedPointId: null,
  cameraPreset: 'perspective',
  timelineProgress: 1,
  setTrajectoryMode: (mode) => set({ trajectoryMode: mode }),
  setClippingEnabled: (enabled) => set({ clippingEnabled: enabled }),
  setClippingHeight: (height) => set({ clippingHeight: height }),
  setSelectedPointId: (id) => set({ selectedPointId: id }),
  setCameraPreset: (preset) => set({ cameraPreset: preset }),
  setTimelineProgress: (progress) =>
    set((state) => ({
      timelineProgress: typeof progress === 'function' ? progress(state.timelineProgress) : progress,
    })),
}));
