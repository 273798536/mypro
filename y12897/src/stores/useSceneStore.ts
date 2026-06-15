import { create } from 'zustand';
import type { SceneSelection, SceneObjectType } from '@/types';

interface FilterState {
  riskLevels: string[];
  dataSources: string[];
  showBuoys: boolean;
  showShips: boolean;
  showFarms: boolean;
  showStations: boolean;
  showAnomalies: boolean;
}

interface SceneState {
  currentFrameIndex: number;
  isPlaying: boolean;
  playSpeed: number;
  clippingEnabled: boolean;
  clippingPlaneY: number;
  selectedObject: SceneSelection | null;
  filters: FilterState;
  cameraPosition: [number, number, number];
}

interface SceneActions {
  setFrameIndex: (index: number | ((prev: number) => number)) => void;
  setPlaying: (playing: boolean) => void;
  setPlaySpeed: (speed: number) => void;
  toggleClipping: () => void;
  setClippingPlaneY: (y: number) => void;
  selectObject: (obj: SceneSelection | null) => void;
  toggleFilter: (type: keyof FilterState, value?: string) => void;
  setCameraPosition: (pos: [number, number, number]) => void;
}

export const useSceneStore = create<SceneState & SceneActions>((set) => ({
  currentFrameIndex: 0,
  isPlaying: false,
  playSpeed: 1,
  clippingEnabled: false,
  clippingPlaneY: 0,
  selectedObject: null,
  filters: {
    riskLevels: ['critical', 'high', 'medium', 'low'],
    dataSources: ['risk_notice', 'buoy', 'ship', 'aquaculture', 'salinity'],
    showBuoys: true,
    showShips: true,
    showFarms: true,
    showStations: true,
    showAnomalies: true,
  },
  cameraPosition: [5, 8, 8],

  setFrameIndex: (index) =>
    set((state) => ({
      currentFrameIndex: typeof index === 'function' ? index(state.currentFrameIndex) : index,
    })),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setPlaySpeed: (speed) => set({ playSpeed: speed }),

  toggleClipping: () =>
    set((state) => ({ clippingEnabled: !state.clippingEnabled })),

  setClippingPlaneY: (y) => set({ clippingPlaneY: y }),

  selectObject: (obj) => set({ selectedObject: obj }),

  toggleFilter: (type, value) =>
    set((state) => {
      if (typeof state.filters[type] === 'boolean') {
        return {
          filters: {
            ...state.filters,
            [type]: !state.filters[type],
          },
        };
      }
      const arr = state.filters[type] as string[];
      if (!value) return state;
      return {
        filters: {
          ...state.filters,
          [type]: arr.includes(value)
            ? arr.filter((v) => v !== value)
            : [...arr, value],
        },
      };
    }),

  setCameraPosition: (pos) => set({ cameraPosition: pos }),
}));
