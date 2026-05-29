import { create } from 'zustand';
import * as THREE from 'three';

interface SceneState {
  cameraTarget: THREE.Vector3;
  cameraPosition: THREE.Vector3;
  isCameraOrtho: boolean;
  showGrid: boolean;
  showWireframe: boolean;
  showRays: boolean;
  showSeats: boolean;
  showHall: boolean;
  showSources: boolean;
  rayOpacity: number;
  hallOpacity: number;
  seatScale: number;
  selectedSeatId: string | null;
  hoveredSeatId: string | null;
  viewPreset: 'perspective' | 'top' | 'front' | 'side';
  setCameraTarget: (target: THREE.Vector3) => void;
  setCameraPosition: (pos: THREE.Vector3) => void;
  toggleCameraOrtho: () => void;
  setShowGrid: (show: boolean) => void;
  setShowWireframe: (show: boolean) => void;
  setShowRays: (show: boolean) => void;
  setShowSeats: (show: boolean) => void;
  setShowHall: (show: boolean) => void;
  setShowSources: (show: boolean) => void;
  setRayOpacity: (opacity: number) => void;
  setHallOpacity: (opacity: number) => void;
  setSeatScale: (scale: number) => void;
  setSelectedSeatId: (id: string | null) => void;
  setHoveredSeatId: (id: string | null) => void;
  setViewPreset: (preset: SceneState['viewPreset']) => void;
  resetView: () => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  cameraTarget: new THREE.Vector3(0, 2, 0),
  cameraPosition: new THREE.Vector3(0, 25, 35),
  isCameraOrtho: false,
  showGrid: true,
  showWireframe: false,
  showRays: true,
  showSeats: true,
  showHall: true,
  showSources: true,
  rayOpacity: 0.8,
  hallOpacity: 0.4,
  seatScale: 1,
  selectedSeatId: null,
  hoveredSeatId: null,
  viewPreset: 'perspective',

  setCameraTarget: (target) => set({ cameraTarget: target }),
  setCameraPosition: (pos) => set({ cameraPosition: pos }),
  toggleCameraOrtho: () => set((state) => ({ isCameraOrtho: !state.isCameraOrtho })),
  setShowGrid: (show) => set({ showGrid: show }),
  setShowWireframe: (show) => set({ showWireframe: show }),
  setShowRays: (show) => set({ showRays: show }),
  setShowSeats: (show) => set({ showSeats: show }),
  setShowHall: (show) => set({ showHall: show }),
  setShowSources: (show) => set({ showSources: show }),
  setRayOpacity: (opacity) => set({ rayOpacity: opacity }),
  setHallOpacity: (opacity) => set({ hallOpacity: opacity }),
  setSeatScale: (scale) => set({ seatScale: scale }),
  setSelectedSeatId: (id) => set({ selectedSeatId: id }),
  setHoveredSeatId: (id) => set({ hoveredSeatId: id }),
  setViewPreset: (preset) => set({ viewPreset: preset }),

  resetView: () =>
    set({
      cameraTarget: new THREE.Vector3(0, 2, 0),
      cameraPosition: new THREE.Vector3(0, 25, 35),
      isCameraOrtho: false,
      viewPreset: 'perspective',
    }),
}));
