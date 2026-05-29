import { create } from 'zustand';
import { 
  ParkingState, 
  ParkingRecord, 
  DemoScenario, 
  ExplanationResult,
  TimelineState,
  FilterState,
  DateType
} from '../types/parking';
import { generateExplanation } from '../utils/explanationEngine';
import { cleanDataset } from '../utils/dataCleaner';
import { calculateOverallPressure } from '../utils/pressureCalculator';

const initialTimeline: TimelineState = {
  currentHour: 8,
  isPlaying: false,
  playbackSpeed: 1,
  minHour: 0,
  maxHour: 24,
};

const initialFilters: FilterState = {
  dateType: 'all',
  selectedFloors: [0, 1, 2, 3],
  selectedEntrances: [],
};

const getRecordAtHour = (records: ParkingRecord[], hour: number): ParkingRecord | null => {
  if (records.length === 0) return null;
  
  const clampedHour = Math.max(0, Math.min(23.99, hour));
  let closest = records[0];
  let minDiff = Math.abs(records[0].hourOfDay - clampedHour);
  
  for (const record of records) {
    const diff = Math.abs(record.hourOfDay - clampedHour);
    if (diff < minDiff) {
      minDiff = diff;
      closest = record;
    }
  }
  
  return closest;
};

interface ParkingActions {
  loadScenario: (scenario: DemoScenario) => void;
  setCurrentHour: (hour: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  togglePlay: () => void;
  resetTimeline: () => void;
  setDateTypeFilter: (dateType: DateType | 'all') => void;
  toggleFloorFilter: (floor: number) => void;
  toggleEntranceFilter: (entrance: string) => void;
  clearFilters: () => void;
  setIsLoading: (loading: boolean) => void;
  loadRawData: (rawData: Array<Partial<ParkingRecord>>) => void;
}

export const useParkingStore = create<ParkingState & ParkingActions>((set, get) => ({
  records: [],
  currentRecord: null,
  explanation: null,
  timeline: initialTimeline,
  filters: initialFilters,
  currentScenario: null,
  isLoading: false,

  loadScenario: (scenario: DemoScenario) => {
    set({ 
      isLoading: true,
      currentScenario: scenario,
      records: scenario.data,
    });

    const firstRecord = scenario.data[0] || null;
    let explanation: ExplanationResult | null = null;
    if (firstRecord) {
      explanation = generateExplanation(firstRecord, scenario.data);
    }

    set({
      currentRecord: firstRecord,
      explanation,
      timeline: { ...initialTimeline, currentHour: firstRecord?.hourOfDay || 8 },
      isLoading: false,
    });
  },

  loadRawData: (rawData: Array<Partial<ParkingRecord>>) => {
    set({ isLoading: true });
    const cleanedData = cleanDataset(rawData);
    
    const scenario: DemoScenario = {
      id: 'custom-' + Date.now(),
      name: '自定义数据',
      type: 'smooth',
      description: '用户导入的停车数据',
      data: cleanedData,
    };

    get().loadScenario(scenario);
  },

  setCurrentHour: (hour: number) => {
    const { records } = get();
    const clampedHour = Math.max(0, Math.min(23.99, hour));
    const record = getRecordAtHour(records, clampedHour);
    
    let explanation: ExplanationResult | null = null;
    if (record) {
      explanation = generateExplanation(record, records);
    }

    set(state => ({
      timeline: { ...state.timeline, currentHour: clampedHour },
      currentRecord: record,
      explanation,
    }));
  },

  setIsPlaying: (playing: boolean) => {
    set(state => ({
      timeline: { ...state.timeline, isPlaying: playing },
    }));
  },

  setPlaybackSpeed: (speed: number) => {
    set(state => ({
      timeline: { ...state.timeline, playbackSpeed: speed },
    }));
  },

  togglePlay: () => {
    set(state => ({
      timeline: { ...state.timeline, isPlaying: !state.timeline.isPlaying },
    }));
  },

  resetTimeline: () => {
    const { records } = get();
    const firstHour = records[0]?.hourOfDay || 0;
    get().setCurrentHour(firstHour);
    set(state => ({
      timeline: { ...state.timeline, isPlaying: false },
    }));
  },

  setDateTypeFilter: (dateType: DateType | 'all') => {
    set(state => ({
      filters: { ...state.filters, dateType },
    }));
  },

  toggleFloorFilter: (floor: number) => {
    set(state => {
      const selected = state.filters.selectedFloors.includes(floor)
        ? state.filters.selectedFloors.filter(f => f !== floor)
        : [...state.filters.selectedFloors, floor];
      return { filters: { ...state.filters, selectedFloors: selected } };
    });
  },

  toggleEntranceFilter: (entrance: string) => {
    set(state => {
      const selected = state.filters.selectedEntrances.includes(entrance)
        ? state.filters.selectedEntrances.filter(e => e !== entrance)
        : [...state.filters.selectedEntrances, entrance];
      return { filters: { ...state.filters, selectedEntrances: selected } };
    });
  },

  clearFilters: () => {
    const { currentRecord } = get();
    const allEntrances = currentRecord?.entrances.map(e => e.entranceName) || [];
    set({
      filters: {
        ...initialFilters,
        selectedEntrances: allEntrances,
      },
    });
  },

  setIsLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));

export const usePressureAtHour = (hour: number): number => {
  const records = useParkingStore(state => state.records);
  const record = getRecordAtHour(records, hour);
  if (!record) return 0;
  return calculateOverallPressure(record.floors, record.entrances, record.dateType, record.hourOfDay);
};

export const useAllPressures = (): number[] => {
  const records = useParkingStore(state => state.records);
  return records.map(r => calculateOverallPressure(r.floors, r.entrances, r.dateType, r.hourOfDay));
};
