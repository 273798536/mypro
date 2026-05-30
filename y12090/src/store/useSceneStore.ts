import { create } from 'zustand';
import type { ViewPreset, CameraState } from '../types/camera';
import { DEFAULT_CAMERA_STATE, DEFAULT_VIEW_PRESETS } from '../types/camera';

interface SceneState {
  cameraState: CameraState;
  viewPresets: ViewPreset[];
  isOrbiting: boolean;
  showAxes: boolean;
  showGrid: boolean;

  setCameraState: (state: CameraState) => void;
  setIsOrbiting: (orbiting: boolean) => void;
  setShowAxes: (show: boolean) => void;
  setShowGrid: (show: boolean) => void;
  saveViewPreset: (name: string) => void;
  deleteViewPreset: (id: string) => void;
  loadViewPreset: (id: string) => void;
  resetCamera: () => void;
}

const STORAGE_KEY = 'sightline-analyzer-view-presets';

const loadPresetsFromStorage = (): ViewPreset[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const userPresets = JSON.parse(stored) as ViewPreset[];
      return [...DEFAULT_VIEW_PRESETS, ...userPresets];
    }
  } catch {
    // ignore
  }
  return DEFAULT_VIEW_PRESETS;
};

export const useSceneStore = create<SceneState>((set, get) => ({
  cameraState: DEFAULT_CAMERA_STATE,
  viewPresets: loadPresetsFromStorage(),
  isOrbiting: false,
  showAxes: true,
  showGrid: true,

  setCameraState: (cameraState) => set({ cameraState }),

  setIsOrbiting: (isOrbiting) => set({ isOrbiting }),

  setShowAxes: (showAxes) => set({ showAxes }),

  setShowGrid: (showGrid) => set({ showGrid }),

  saveViewPreset: (name) => {
    const { cameraState, viewPresets } = get();
    const newPreset: ViewPreset = {
      id: `preset-${Date.now()}`,
      name,
      position: { ...cameraState.position },
      target: { ...cameraState.target },
      fov: cameraState.fov,
      createdAt: Date.now(),
    };

    const userPresets = viewPresets.filter((p) => !DEFAULT_VIEW_PRESETS.find((d) => d.id === p.id));
    const updatedUserPresets = [...userPresets, newPreset];

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUserPresets));
    } catch {
      // ignore
    }

    set({
      viewPresets: [...DEFAULT_VIEW_PRESETS, ...updatedUserPresets],
    });
  },

  deleteViewPreset: (id) => {
    if (DEFAULT_VIEW_PRESETS.find((p) => p.id === id)) return;

    const { viewPresets } = get();
    const remaining = viewPresets.filter((p) => p.id !== id);
    const userPresets = remaining.filter((p) => !DEFAULT_VIEW_PRESETS.find((d) => d.id === p.id));

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userPresets));
    } catch {
      // ignore
    }

    set({ viewPresets: remaining });
  },

  loadViewPreset: (id) => {
    const { viewPresets } = get();
    const preset = viewPresets.find((p) => p.id === id);
    if (preset) {
      set({
        cameraState: {
          position: { ...preset.position },
          target: { ...preset.target },
          fov: preset.fov,
        },
      });
    }
  },

  resetCamera: () =>
    set({
      cameraState: DEFAULT_CAMERA_STATE,
    }),
}));
