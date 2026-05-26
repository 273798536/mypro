import { create } from 'zustand';
import type { TrajectoryParams, TrajectoryResult, ValidationResult } from '@/types/trajectory';
import { DEFAULT_PARAMS } from '@/types/trajectory';
import { calculateTrajectory } from '@/physics/trajectory';
import { validateParams, checkLandingBounds } from '@/utils/validator';

interface TrajectoryState {
  currentParams: TrajectoryParams;
  currentResult: TrajectoryResult | null;
  playbackProgress: number;
  playbackSpeed: number;
  isPlaying: boolean;
  validation: ValidationResult;
  setParams: (params: Partial<TrajectoryParams>) => void;
  calculate: () => void;
  setPlaybackProgress: (progress: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  togglePlay: () => void;
  resetParams: () => void;
}

export const useTrajectoryStore = create<TrajectoryState>((set, get) => ({
  currentParams: { ...DEFAULT_PARAMS, id: generateId() },
  currentResult: null,
  playbackProgress: 0,
  playbackSpeed: 1,
  isPlaying: false,
  validation: { valid: true, errors: [], warnings: [] },

  setParams: (params) => {
    set((state) => ({
      currentParams: { ...state.currentParams, ...params, timestamp: Date.now() },
    }));
  },

  calculate: () => {
    const { currentParams } = get();
    const validation = validateParams(currentParams);

    if (!validation.valid) {
      set({ validation });
      return;
    }

    const result = calculateTrajectory(currentParams);

    const landingValidation = checkLandingBounds(
      result.landing.x,
      result.landing.z,
      currentParams.source.lineNumber,
      currentParams.source.origin,
    );

    result.validation = {
      valid: validation.valid && landingValidation.valid,
      errors: [...validation.errors, ...landingValidation.errors],
      warnings: [...validation.warnings, ...landingValidation.warnings],
    };

    set({
      currentResult: result,
      validation: result.validation,
      playbackProgress: 0,
      isPlaying: false,
    });
  },

  setPlaybackProgress: (progress) => {
    set({ playbackProgress: Math.max(0, Math.min(1, progress)) });
  },

  setPlaybackSpeed: (speed) => {
    set({ playbackSpeed: speed });
  },

  togglePlay: () => {
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  resetParams: () => {
    set({
      currentParams: { ...DEFAULT_PARAMS, id: generateId() },
      currentResult: null,
      playbackProgress: 0,
      isPlaying: false,
      validation: { valid: true, errors: [], warnings: [] },
    });
  },
}));

function generateId(): string {
  return `T${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
