import { create } from 'zustand';
import type { SceneState, Slope, Accident, ValidationError } from '@/types';

interface SceneStore extends SceneState {
  validationErrors: ValidationError[];
  setCameraPosition: (pos: [number, number, number]) => void;
  setCameraTarget: (target: [number, number, number]) => void;
  selectArea: (area: Slope | null) => void;
  selectAccident: (accident: Accident | null) => void;
  setDetailDrawerOpen: (open: boolean) => void;
  setValidationErrors: (errors: ValidationError[]) => void;
  addValidationError: (error: ValidationError) => void;
  clearValidationErrors: () => void;
}

export const useSceneStore = create<SceneStore>((set) => ({
  cameraPosition: [80, 80, 80],
  cameraTarget: [10, 0, 0],
  selectedArea: null,
  selectedAccident: null,
  isDetailDrawerOpen: false,
  validationErrors: [],

  setCameraPosition: (pos) => set({ cameraPosition: pos }),
  setCameraTarget: (target) => set({ cameraTarget: target }),
  selectArea: (area) =>
    set({ selectedArea: area, isDetailDrawerOpen: area !== null }),
  selectAccident: (accident) =>
    set({ selectedAccident: accident, isDetailDrawerOpen: accident !== null }),
  setDetailDrawerOpen: (open) => set({ isDetailDrawerOpen: open }),
  setValidationErrors: (errors) => set({ validationErrors: errors }),
  addValidationError: (error) =>
    set((state) => ({
      validationErrors: [...state.validationErrors, error],
    })),
  clearValidationErrors: () => set({ validationErrors: [] }),
}));
