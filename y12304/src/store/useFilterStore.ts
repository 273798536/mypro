import { create } from 'zustand';
import { FilterState, ObjectType, AlarmLevel } from '../types';

interface FilterStore extends FilterState {
  toggleType: (type: ObjectType) => void;
  toggleAlarmLevel: (level: AlarmLevel) => void;
  setTemperatureRange: (range: [number, number]) => void;
  setSearchKeyword: (keyword: string) => void;
  setShowTemperatureField: (show: boolean) => void;
  resetFilters: () => void;
}

const initialState: FilterState = {
  selectedTypes: ['rack', 'vent', 'tray', 'sensor'],
  alarmLevels: ['critical', 'warning', 'info'],
  temperatureRange: [18, 40],
  searchKeyword: '',
  showTemperatureField: false,
};

export const useFilterStore = create<FilterStore>((set) => ({
  ...initialState,

  toggleType: (type) =>
    set((state) => ({
      selectedTypes: state.selectedTypes.includes(type)
        ? state.selectedTypes.filter((t) => t !== type)
        : [...state.selectedTypes, type],
    })),

  toggleAlarmLevel: (level) =>
    set((state) => ({
      alarmLevels: state.alarmLevels.includes(level)
        ? state.alarmLevels.filter((l) => l !== level)
        : [...state.alarmLevels, level],
    })),

  setTemperatureRange: (range) => set({ temperatureRange: range }),
  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),
  setShowTemperatureField: (show) => set({ showTemperatureField: show }),

  resetFilters: () => set(initialState),
}));
