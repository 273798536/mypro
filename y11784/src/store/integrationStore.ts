import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IntegrationConfig, IntegrationMethod } from '@/types';
import { DEFAULT_INTEGRATION_CONFIG } from '@/shared/constants';

interface IntegrationState {
  config: IntegrationConfig;
  selectedPathIds: string[];
  isComputing: boolean;
  setMethod: (method: IntegrationMethod) => void;
  setStepSize: (stepSize: number) => void;
  setAdaptiveTolerance: (tolerance: number) => void;
  setGaussOrder: (order: number) => void;
  setConfig: (config: Partial<IntegrationConfig>) => void;
  togglePathSelection: (pathId: string) => void;
  selectAllPaths: (pathIds: string[]) => void;
  clearSelection: () => void;
  setIsComputing: (isComputing: boolean) => void;
  resetConfig: () => void;
}

export const useIntegrationStore = create<IntegrationState>()(
  persist(
    (set) => ({
      config: { ...DEFAULT_INTEGRATION_CONFIG },
      selectedPathIds: [],
      isComputing: false,

      setMethod: (method) =>
        set((state) => ({
          config: { ...state.config, method },
        })),

      setStepSize: (stepSize) =>
        set((state) => ({
          config: { ...state.config, stepSize },
        })),

      setAdaptiveTolerance: (adaptiveTolerance) =>
        set((state) => ({
          config: { ...state.config, adaptiveTolerance },
        })),

      setGaussOrder: (gaussOrder) =>
        set((state) => ({
          config: { ...state.config, gaussOrder },
        })),

      setConfig: (config) =>
        set((state) => ({
          config: { ...state.config, ...config },
        })),

      togglePathSelection: (pathId) =>
        set((state) => ({
          selectedPathIds: state.selectedPathIds.includes(pathId)
            ? state.selectedPathIds.filter((id) => id !== pathId)
            : [...state.selectedPathIds, pathId],
        })),

      selectAllPaths: (pathIds) =>
        set({
          selectedPathIds: pathIds,
        }),

      clearSelection: () =>
        set({
          selectedPathIds: [],
        }),

      setIsComputing: (isComputing) =>
        set({
          isComputing,
        }),

      resetConfig: () =>
        set({
          config: { ...DEFAULT_INTEGRATION_CONFIG },
        }),
    }),
    {
      name: 'integration-store',
    }
  )
);
