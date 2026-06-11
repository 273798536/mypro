import { create } from 'zustand';
import { FilterConditions } from '../types';

interface FilterState {
  conditions: FilterConditions;
  setTimeRange: (start: string, end: string) => void;
  clearTimeRange: () => void;
  setProcessStatus: (statuses: string[]) => void;
  toggleProcessStatus: (status: string) => void;
  setSources: (sources: string[]) => void;
  toggleSource: (source: string) => void;
  setLayers: (layers: string[]) => void;
  toggleLayer: (layer: string) => void;
  resetFilters: () => void;
  setFilters: (conditions: FilterConditions) => void;
}

const defaultConditions: FilterConditions = {
  timeRange: null,
  processStatus: [],
  sources: [],
  layers: [],
};

export const useFilterStore = create<FilterState>((set) => ({
  conditions: defaultConditions,

  setTimeRange: (start: string, end: string) =>
    set((state) => ({
      conditions: {
        ...state.conditions,
        timeRange: { start, end },
      },
    })),

  clearTimeRange: () =>
    set((state) => ({
      conditions: {
        ...state.conditions,
        timeRange: null,
      },
    })),

  setProcessStatus: (statuses: string[]) =>
    set((state) => ({
      conditions: {
        ...state.conditions,
        processStatus: statuses,
      },
    })),

  toggleProcessStatus: (status: string) =>
    set((state) => {
      const current = state.conditions.processStatus;
      const next = current.includes(status)
        ? current.filter((s) => s !== status)
        : [...current, status];
      return {
        conditions: {
          ...state.conditions,
          processStatus: next,
        },
      };
    }),

  setSources: (sources: string[]) =>
    set((state) => ({
      conditions: {
        ...state.conditions,
        sources,
      },
    })),

  toggleSource: (source: string) =>
    set((state) => {
      const current = state.conditions.sources;
      const next = current.includes(source)
        ? current.filter((s) => s !== source)
        : [...current, source];
      return {
        conditions: {
          ...state.conditions,
          sources: next,
        },
      };
    }),

  setLayers: (layers: string[]) =>
    set((state) => ({
      conditions: {
        ...state.conditions,
        layers,
      },
    })),

  toggleLayer: (layer: string) =>
    set((state) => {
      const current = state.conditions.layers;
      const next = current.includes(layer)
        ? current.filter((l) => l !== layer)
        : [...current, layer];
      return {
        conditions: {
          ...state.conditions,
          layers: next,
        },
      };
    }),

  resetFilters: () =>
    set({
      conditions: defaultConditions,
    }),

  setFilters: (conditions: FilterConditions) =>
    set({ conditions }),
}));
