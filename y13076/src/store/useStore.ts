import { create } from 'zustand';
import type { SensorRecord, FilterCriteria, AnomalyRecord, HistoricalNote, AttachedMaterial, PlaybackState, AnomalyStatus } from '@/types';
import { mockSensorData, mockAnomalyRecords, mockHistoricalNotes } from '@/data/mockData';

interface AppStore {
  sensorData: SensorRecord[];
  filteredData: SensorRecord[];
  filterCriteria: FilterCriteria;
  setFilterCriteria: (criteria: Partial<FilterCriteria>) => void;
  applyFilters: () => void;

  playback: PlaybackState;
  togglePlayback: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setCurrentTime: (time: string) => void;

  anomalies: AnomalyRecord[];
  updateAnomalyStatus: (id: string, status: AnomalyStatus) => void;
  addAnomaly: (record: AnomalyRecord) => void;
  addMaterial: (anomalyId: string, material: AttachedMaterial) => void;

  historicalNotes: HistoricalNote[];
  selectedSensorName: string | null;
  setSelectedSensor: (name: string | null) => void;

  isHistoryDrawerOpen: boolean;
  toggleHistoryDrawer: () => void;

  isExportPanelOpen: boolean;
  toggleExportPanel: () => void;

  activeAnomalyId: string | null;
  setActiveAnomaly: (id: string | null) => void;
}

const defaultFilter: FilterCriteria = {
  id: 'f-current',
  timeRangeStart: '2026-06-10T00:00:00',
  timeRangeEnd: '2026-06-10T23:59:59',
  channel: '冷通道A',
  sensorType: 'temperature',
};

function filterSensorData(data: SensorRecord[], criteria: FilterCriteria): SensorRecord[] {
  return data.filter((d) => {
    if (d.timestamp < criteria.timeRangeStart || d.timestamp > criteria.timeRangeEnd) return false;
    if (criteria.channel && d.channel !== criteria.channel) return false;
    if (criteria.cabinet && d.cabinet !== criteria.cabinet) return false;
    if (criteria.sensorType && d.type !== criteria.sensorType) return false;
    return true;
  });
}

export const useStore = create<AppStore>((set, get) => ({
  sensorData: mockSensorData,
  filteredData: filterSensorData(mockSensorData, defaultFilter),
  filterCriteria: defaultFilter,
  setFilterCriteria: (criteria) =>
    set((state) => ({
      filterCriteria: { ...state.filterCriteria, ...criteria },
    })),
  applyFilters: () =>
    set((state) => ({
      filteredData: filterSensorData(state.sensorData, state.filterCriteria),
    })),

  playback: {
    isPlaying: false,
    speed: 1,
    currentTime: '2026-06-10T00:00:00',
  },
  togglePlayback: () =>
    set((state) => ({
      playback: { ...state.playback, isPlaying: !state.playback.isPlaying },
    })),
  setPlaybackSpeed: (speed) =>
    set((state) => ({
      playback: { ...state.playback, speed },
    })),
  setCurrentTime: (time) =>
    set((state) => ({
      playback: { ...state.playback, currentTime: time },
    })),

  anomalies: mockAnomalyRecords,
  updateAnomalyStatus: (id, status) =>
    set((state) => ({
      anomalies: state.anomalies.map((a) => (a.id === id ? { ...a, status } : a)),
    })),
  addAnomaly: (record) =>
    set((state) => ({ anomalies: [...state.anomalies, record] })),
  addMaterial: (anomalyId, material) =>
    set((state) => ({
      anomalies: state.anomalies.map((a) =>
        a.id === anomalyId ? { ...a, materials: [...a.materials, material] } : a
      ),
    })),

  historicalNotes: mockHistoricalNotes,
  selectedSensorName: null,
  setSelectedSensor: (name) => set({ selectedSensorName: name, isHistoryDrawerOpen: name !== null }),

  isHistoryDrawerOpen: false,
  toggleHistoryDrawer: () =>
    set((state) => ({ isHistoryDrawerOpen: !state.isHistoryDrawerOpen })),

  isExportPanelOpen: false,
  toggleExportPanel: () =>
    set((state) => ({ isExportPanelOpen: !state.isExportPanelOpen })),

  activeAnomalyId: null,
  setActiveAnomaly: (id) => set({ activeAnomalyId: id }),
}));

if (typeof window !== 'undefined') {
  (window as any).__PLAYBACK_STORE__ = useStore;
}
