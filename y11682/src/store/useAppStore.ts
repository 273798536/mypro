import { create } from 'zustand';
import {
  Building,
  Playground,
  TimeSettings,
  ValidationError,
  CorrectionLog,
  SunlightStats
} from '../types';
import { mockBuildings } from '../data/buildings';
import { mockPlaygrounds } from '../data/playgrounds';
import { validateBuildingData } from '../utils/validation';
import { validateTimezone } from '../utils/timezone';
import { calculateAllPlaygroundsSunlight } from '../utils/sunlightStats';

interface AppState {
  buildings: Building[];
  playgrounds: Playground[];
  selectedPlaygroundId: string | null;
  timeSettings: TimeSettings;
  errors: ValidationError[];
  corrections: CorrectionLog[];
  sunlightStats: SunlightStats[];
  showShadows: boolean;
  showGrid: boolean;
  showPlaygroundBoundaries: boolean;
  isStatsLoading: boolean;
  
  setSelectedPlayground: (id: string | null) => void;
  setTime: (hour: number, minute: number) => void;
  setDate: (date: string) => void;
  setTimezone: (timezone: string) => void;
  setPlaying: (isPlaying: boolean) => void;
  setPlaySpeed: (speed: number) => void;
  toggleShadows: () => void;
  toggleGrid: () => void;
  togglePlaygroundBoundaries: () => void;
  addError: (error: ValidationError) => void;
  clearErrors: () => void;
  dismissError: (errorId: string) => void;
  addCorrection: (correction: Omit<CorrectionLog, 'id' | 'timestamp'>) => void;
  updateBuilding: (id: string, updates: Partial<Building>, reason: string) => void;
  recalculateSunlightStats: () => void;
  getCurrentDateTime: () => Date;
}

const initialTimeSettings: TimeSettings = {
  date: new Date().toISOString().split('T')[0],
  hour: 10,
  minute: 0,
  timezone: 'Asia/Shanghai',
  isPlaying: false,
  playSpeed: 1
};

export const useAppStore = create<AppState>((set, get) => {
  const initialErrors: ValidationError[] = [];
  
  mockBuildings.forEach((building, index) => {
    const error = validateBuildingData(building, index);
    if (error) {
      initialErrors.push(error);
    }
  });

  const tzError = validateTimezone(
    initialTimeSettings.timezone,
    'Asia/Shanghai',
    '系统配置',
    1
  );
  if (tzError) {
    initialErrors.push(tzError);
  }

  return {
    buildings: mockBuildings,
    playgrounds: mockPlaygrounds,
    selectedPlaygroundId: null,
    timeSettings: initialTimeSettings,
    errors: initialErrors,
    corrections: [],
    sunlightStats: [],
    showShadows: true,
    showGrid: true,
    showPlaygroundBoundaries: true,
    isStatsLoading: false,

    setSelectedPlayground: (id) => set({ selectedPlaygroundId: id }),

    setTime: (hour, minute) => set({
      timeSettings: { ...get().timeSettings, hour, minute }
    }),

    setDate: (date) => {
      set({ timeSettings: { ...get().timeSettings, date } });
      setTimeout(() => get().recalculateSunlightStats(), 0);
    },

    setTimezone: (timezone) => set({
      timeSettings: { ...get().timeSettings, timezone }
    }),

    setPlaying: (isPlaying) => set({
      timeSettings: { ...get().timeSettings, isPlaying }
    }),

    setPlaySpeed: (playSpeed) => set({
      timeSettings: { ...get().timeSettings, playSpeed }
    }),

    toggleShadows: () => set({ showShadows: !get().showShadows }),

    toggleGrid: () => set({ showGrid: !get().showGrid }),

    togglePlaygroundBoundaries: () => set({ 
      showPlaygroundBoundaries: !get().showPlaygroundBoundaries 
    }),

    addError: (error) => set({
      errors: [...get().errors.filter(e => e.id !== error.id), error]
    }),

    clearErrors: () => set({ errors: [] }),

    dismissError: (errorId) => set({
      errors: get().errors.filter(e => e.id !== errorId)
    }),

    addCorrection: (correction) => set({
      corrections: [
        ...get().corrections,
        {
          ...correction,
          id: `corr-${Date.now()}`,
          timestamp: Date.now()
        }
      ]
    }),

    updateBuilding: (id, updates, reason) => {
      const building = get().buildings.find(b => b.id === id);
      if (!building) return;

      Object.entries(updates).forEach(([field, newValue]) => {
        const oldValue = String(building[field as keyof Building] ?? '');
        get().addCorrection({
          targetType: 'building',
          targetId: id,
          field,
          oldValue,
          newValue: String(newValue),
          reason
        });
      });

      set({
        buildings: get().buildings.map(b =>
          b.id === id ? { ...b, ...updates } : b
        )
      });

      setTimeout(() => get().recalculateSunlightStats(), 0);
    },

    recalculateSunlightStats: () => {
      set({ isStatsLoading: true });
      
      setTimeout(() => {
        const { buildings, playgrounds, timeSettings } = get();
        const date = new Date(timeSettings.date);
        
        const { stats, errors } = calculateAllPlaygroundsSunlight(
          playgrounds,
          buildings,
          date
        );

        errors.forEach(error => get().addError(error));

        set({
          sunlightStats: stats,
          isStatsLoading: false
        });
      }, 100);
    },

    getCurrentDateTime: () => {
      const { timeSettings } = get();
      const date = new Date(timeSettings.date);
      date.setHours(timeSettings.hour, timeSettings.minute, 0, 0);
      return date;
    }
  };
});
