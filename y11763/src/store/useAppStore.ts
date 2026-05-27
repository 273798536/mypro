import { create } from 'zustand';
import { ImportResult, ValidationError } from '../types/particle';

interface AppState {
  isPlaying: boolean;
  timeScale: number;
  currentTime: number;
  showTraceHistory: boolean;
  importResults: ImportResult[];
  errors: ValidationError[];
  showErrors: boolean;
  togglePlay: () => void;
  setTimeScale: (scale: number) => void;
  setCurrentTime: (time: number) => void;
  toggleTraceHistory: () => void;
  addImportResult: (result: ImportResult) => void;
  setErrors: (errors: ValidationError[]) => void;
  toggleShowErrors: () => void;
  clearErrors: () => void;
  resetApp: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isPlaying: true,
  timeScale: 1.0,
  currentTime: 0,
  showTraceHistory: false,
  importResults: [],
  errors: [],
  showErrors: false,

  togglePlay: () => {
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  setTimeScale: (scale) => {
    set({ timeScale: Math.max(0.1, Math.min(5, scale)) });
  },

  setCurrentTime: (time) => {
    set({ currentTime: time });
  },

  toggleTraceHistory: () => {
    set((state) => ({ showTraceHistory: !state.showTraceHistory }));
  },

  addImportResult: (result) => {
    set((state) => ({
      importResults: [...state.importResults, result],
    }));
  },

  setErrors: (errors) => {
    set({ errors, showErrors: errors.length > 0 });
  },

  toggleShowErrors: () => {
    set((state) => ({ showErrors: !state.showErrors }));
  },

  clearErrors: () => {
    set({ errors: [], showErrors: false });
  },

  resetApp: () => {
    set({
      isPlaying: true,
      timeScale: 1.0,
      currentTime: 0,
      showTraceHistory: false,
      errors: [],
      showErrors: false,
    });
  },
}));
