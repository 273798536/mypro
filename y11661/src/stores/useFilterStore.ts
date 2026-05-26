import { create } from 'zustand';
import type { FilterState, AlertType, TimeRange } from '../types';

interface FilterStore extends FilterState {
  setTimeRange: (range: TimeRange | null) => void;
  setHeatThreshold: (min: number, max: number) => void;
  setAlertTypes: (types: AlertType[]) => void;
  toggleAlertType: (type: AlertType) => void;
  setShowOnlyUnresolved: (show: boolean) => void;
  setSelectedRobots: (robotIds: string[]) => void;
  toggleSelectedRobot: (robotId: string) => void;
  resetFilters: () => void;
}

const defaultState: FilterState = {
  timeRange: null,
  heatThreshold: {
    min: 0,
    max: 100,
  },
  alertTypes: [],
  showOnlyUnresolved: false,
  selectedRobots: [],
};

export const useFilterStore = create<FilterStore>((set, get) => ({
  ...defaultState,

  setTimeRange: (range) => set({ timeRange: range }),

  setHeatThreshold: (min, max) =>
    set({
      heatThreshold: { min, max },
    }),

  setAlertTypes: (types) => set({ alertTypes: types }),

  toggleAlertType: (type) => {
    const { alertTypes } = get();
    const hasType = alertTypes.includes(type);
    set({
      alertTypes: hasType
        ? alertTypes.filter((t) => t !== type)
        : [...alertTypes, type],
    });
  },

  setShowOnlyUnresolved: (show) => set({ showOnlyUnresolved: show }),

  setSelectedRobots: (robotIds) => set({ selectedRobots: robotIds }),

  toggleSelectedRobot: (robotId) => {
    const { selectedRobots } = get();
    const hasRobot = selectedRobots.includes(robotId);
    set({
      selectedRobots: hasRobot
        ? selectedRobots.filter((id) => id !== robotId)
        : [...selectedRobots, robotId],
    });
  },

  resetFilters: () => set(defaultState),
}));
