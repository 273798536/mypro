import { create } from 'zustand'
import type { SceneState, LayerVisibility, PlaybackSpeed, Position3D } from '../types/scene'

interface SceneStore extends SceneState {
  setCurrentTime: (time: Date) => void
  setIsPlaying: (playing: boolean) => void
  setPlaybackSpeed: (speed: PlaybackSpeed) => void
  setSelectedRackId: (id: string | null) => void
  setSelectedAlertId: (id: string | null) => void
  toggleLayer: (layer: keyof LayerVisibility) => void
  setLayerVisibility: (layers: Partial<LayerVisibility>) => void
  setCameraPosition: (position: Position3D) => void
  setCameraTarget: (target: Position3D) => void
  resetCamera: () => void
}

const defaultCameraPosition: Position3D = { x: 12, y: 10, z: 12 }
const defaultCameraTarget: Position3D = { x: 0, y: 0, z: 0 }

export const useSceneStore = create<SceneStore>((set) => ({
  currentTime: new Date(),
  isPlaying: false,
  playbackSpeed: 1,
  selectedRackId: null,
  selectedAlertId: null,
  layers: {
    racks: true,
    acUnits: true,
    temperatureCloud: true,
    alerts: true,
    loadIndicators: true,
    airflowParticles: true,
  },
  cameraPosition: defaultCameraPosition,
  cameraTarget: defaultCameraTarget,

  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setSelectedRackId: (id) => set({ selectedRackId: id }),
  setSelectedAlertId: (id) => set({ selectedAlertId: id }),
  
  toggleLayer: (layer) => set((state) => ({
    layers: {
      ...state.layers,
      [layer]: !state.layers[layer],
    },
  })),
  
  setLayerVisibility: (layers) => set((state) => ({
    layers: {
      ...state.layers,
      ...layers,
    },
  })),
  
  setCameraPosition: (position) => set({ cameraPosition: position }),
  setCameraTarget: (target) => set({ cameraTarget: target }),
  
  resetCamera: () => set({
    cameraPosition: defaultCameraPosition,
    cameraTarget: defaultCameraTarget,
  }),
}))
