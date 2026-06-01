
import { create } from 'zustand';
import type { SceneState } from '../types';

interface SceneStore extends SceneState {
  setSelectedFloorId: (id: string | null) => void;
  setSelectedObject: (obj: { type: string; id: string } | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackTime: (time: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setFocusPosition: (pos: { x: number; y: number; z: number } | null) => void;
  resetPlayback: () => void;
}

export const useSceneStore = create<SceneStore>((set) => ({
  selectedFloorId: null,
  selectedObject: null,
  isPlaying: false,
  playbackTime: 0,
  playbackSpeed: 1,
  focusPosition: null,
  
  setSelectedFloorId: (selectedFloorId) => set({ selectedFloorId }),
  setSelectedObject: (selectedObject) => set({ selectedObject }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPlaybackTime: (playbackTime) => set({ playbackTime }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setFocusPosition: (focusPosition) => set({ focusPosition }),
  
  resetPlayback: () => set({
    isPlaying: false,
    playbackTime: 0
  })
}));

