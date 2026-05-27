import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LensState, StepRecord, CONSTANTS } from '../types';
import { calculateLensImage } from '../physics/lensCalculator';

interface LensStore {
  lensState: LensState;
  steps: StepRecord[];
  setFocalLength: (f: number) => void;
  setObjectDistance: (u: number) => void;
  saveStep: (note?: string) => void;
  loadStep: (id: string) => void;
  deleteStep: (id: string) => void;
  clearSteps: () => void;
  reset: () => void;
}

const initialState = calculateLensImage(
  CONSTANTS.DEFAULT_FOCAL_LENGTH,
  CONSTANTS.DEFAULT_OBJECT_DISTANCE,
  CONSTANTS.DEFAULT_OBJECT_HEIGHT
);

export const useLensStore = create<LensStore>()(
  persist(
    (set, get) => ({
      lensState: initialState,
      steps: [],
      setFocalLength: (f: number) => {
        const { objectDistance, objectHeight } = get().lensState;
        const newState = calculateLensImage(f, objectDistance, objectHeight);
        set({ lensState: newState });
      },
      setObjectDistance: (u: number) => {
        const { focalLength, objectHeight } = get().lensState;
        const newState = calculateLensImage(focalLength, u, objectHeight);
        set({ lensState: newState });
      },
      saveStep: (note?: string) => {
        const { lensState, steps } = get();
        const step: StepRecord = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          state: { ...lensState },
          source: 'user',
          note,
        };
        set({ steps: [...steps, step] });
      },
      loadStep: (id: string) => {
        const { steps } = get();
        const step = steps.find(s => s.id === id);
        if (step) {
          set({ lensState: { ...step.state } });
        }
      },
      deleteStep: (id: string) => {
        const { steps } = get();
        set({ steps: steps.filter(s => s.id !== id) });
      },
      clearSteps: () => set({ steps: [] }),
      reset: () => set({ lensState: initialState }),
    }),
    {
      name: 'lens-simulator-storage',
      partialize: (state) => ({ steps: state.steps }),
    }
  )
);
