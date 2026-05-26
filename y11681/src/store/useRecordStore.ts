import { create } from 'zustand';
import type { TrainingRecord } from '@/types/record';
import type { TrajectoryResult } from '@/types/trajectory';

interface RecordState {
  records: TrainingRecord[];
  selectedRecordId: string | null;
  selectedCompareIds: string[];
  addRecord: (result: TrajectoryResult, notes?: string) => void;
  deleteRecord: (id: string) => void;
  selectRecord: (id: string | null) => void;
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  exportJSON: () => string;
  exportCSV: () => string;
}

const STORAGE_KEY = 'golf_analyzer_records';

function loadFromStorage(): TrainingRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToStorage(records: TrainingRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    console.warn('Failed to save records to storage');
  }
}

export const useRecordStore = create<RecordState>((set, get) => ({
  records: loadFromStorage(),
  selectedRecordId: null,
  selectedCompareIds: [],

  addRecord: (result, notes = '') => {
    const record: TrainingRecord = {
      id: `R${Date.now().toString(36)}`,
      sessionId: `S${Date.now().toString(36).slice(0, 6)}`,
      timestamp: Date.now(),
      params: result.params,
      result,
      notes,
      modifications: [],
      tags: [],
    };
    set((state) => {
      const records = [record, ...state.records].slice(0, 100);
      saveToStorage(records);
      return { records };
    });
  },

  deleteRecord: (id) => {
    set((state) => {
      const records = state.records.filter((r) => r.id !== id);
      saveToStorage(records);
      return {
        records,
        selectedCompareIds: state.selectedCompareIds.filter((rid) => rid !== id),
        selectedRecordId: state.selectedRecordId === id ? null : state.selectedRecordId,
      };
    });
  },

  selectRecord: (id) => set({ selectedRecordId: id }),

  toggleCompare: (id) => {
    set((state) => {
      const ids = state.selectedCompareIds.includes(id)
        ? state.selectedCompareIds.filter((rid) => rid !== id)
        : state.selectedCompareIds.length < 4
          ? [...state.selectedCompareIds, id]
          : state.selectedCompareIds;
      return { selectedCompareIds: ids };
    });
  },

  clearCompare: () => set({ selectedCompareIds: [] }),

  exportJSON: () => {
    const { records } = get();
    return JSON.stringify(records, null, 2);
  },

  exportCSV: () => {
    const { records } = get();
    if (records.length === 0) return '';

    const headers = [
      'id', 'timestamp', 'session_id', 'notes',
      'ball_speed', 'ball_speed_unit', 'launch_angle', 'backspin', 'sidespin',
      'wind_speed', 'wind_direction', 'temperature', 'humidity',
      'total_distance', 'carry_distance', 'landing_x', 'landing_z', 'apex_height',
    ];

    const rows = records.map(r => [
      r.id,
      r.timestamp,
      r.sessionId,
      `"${r.notes.replace(/"/g, '""')}"`,
      r.params.ballSpeed,
      r.params.ballSpeedUnit,
      r.params.launchAngle,
      r.params.backspin,
      r.params.sidespin,
      r.params.windSpeed,
      r.params.windDirection,
      r.params.temperature,
      r.params.humidity,
      r.result.landing.distance.toFixed(2),
      r.result.landing.carry.toFixed(2),
      r.result.landing.x.toFixed(2),
      r.result.landing.z.toFixed(2),
      r.result.apex.height.toFixed(2),
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  },
}));
