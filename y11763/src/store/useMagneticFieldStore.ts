import { create } from 'zustand';
import { MagneticField, Vector3Data } from '../types/particle';

interface MagneticFieldState {
  field: MagneticField;
  setStrength: (strength: number) => void;
  setDirection: (direction: Vector3Data) => void;
  toggleVisibility: () => void;
  resetField: () => void;
}

const DEFAULT_FIELD: MagneticField = {
  strength: 1.0,
  direction: { x: 0, y: 1, z: 0 },
  isVisible: true,
};

export const useMagneticFieldStore = create<MagneticFieldState>((set) => ({
  field: DEFAULT_FIELD,

  setStrength: (strength) => {
    set((state) => ({
      field: { ...state.field, strength: Math.max(0, Math.min(5, strength)) },
    }));
  },

  setDirection: (direction) => {
    const length = Math.sqrt(
      direction.x ** 2 + direction.y ** 2 + direction.z ** 2
    );
    if (length === 0) return;
    
    set((state) => ({
      field: {
        ...state.field,
        direction: {
          x: direction.x / length,
          y: direction.y / length,
          z: direction.z / length,
        },
      },
    }));
  },

  toggleVisibility: () => {
    set((state) => ({
      field: { ...state.field, isVisible: !state.field.isVisible },
    }));
  },

  resetField: () => {
    set({ field: { ...DEFAULT_FIELD } });
  },
}));
