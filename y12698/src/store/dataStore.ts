import { create } from 'zustand';
import type { DataRecord, ProfileVersion, ThresholdConfig } from '../types';
import { SAMPLE_RECORDS, SAMPLE_PROFILES, THRESHOLDS } from '../data/sampleRecords';
import { transformToScene, distance3D } from '../utils/coordinateTransform';

const DUPLICATE_THRESHOLD = 2.0;

interface DataState {
  records: DataRecord[];
  profiles: ProfileVersion[];
  thresholds: ThresholdConfig;
  activeCoordinateSystem: 'ALL' | 'WGS84' | 'UTM51N' | 'LOCAL';
  filterStatus: 'ALL' | 'pending' | 'approved' | 'disputed';
  showDuplicates: boolean;
  showOutOfBounds: boolean;
  initIfEmpty: () => void;
  setActiveCoordinateSystem: (s: DataState['activeCoordinateSystem']) => void;
  setFilterStatus: (s: DataState['filterStatus']) => void;
  toggleShowDuplicates: () => void;
  toggleShowOutOfBounds: () => void;
  updateRecord: (id: string, patch: Partial<DataRecord>) => void;
  updateRecordConclusion: (id: string, conclusion: string) => void;
  getRecordProfiles: (recordId: string) => ProfileVersion[];
  getFilteredRecords: () => DataRecord[];
  getOutOfBoundsCount: () => number;
  getDuplicateCount: () => number;
  runDuplicateCheck: () => void;
  mergeDuplicate: (sourceId: string, targetId: string) => void;
}

const STORAGE_KEY = 'hydrothermal-data';

function loadState(): { records: DataRecord[]; profiles: ProfileVersion[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function persist(records: DataRecord[], profiles: ProfileVersion[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ records, profiles }));
}

export const useDataStore = create<DataState>((set, get) => ({
  records: [],
  profiles: [],
  thresholds: THRESHOLDS,
  activeCoordinateSystem: 'ALL',
  filterStatus: 'ALL',
  showDuplicates: true,
  showOutOfBounds: true,

  initIfEmpty: () => {
    if (get().records.length > 0) return;
    const saved = loadState();
    if (saved) {
      set({ records: saved.records, profiles: saved.profiles });
    } else {
      set({ records: SAMPLE_RECORDS, profiles: SAMPLE_PROFILES });
      persist(SAMPLE_RECORDS, SAMPLE_PROFILES);
    }
  },

  setActiveCoordinateSystem: (s) => set({ activeCoordinateSystem: s }),
  setFilterStatus: (s) => set({ filterStatus: s }),
  toggleShowDuplicates: () => set({ showDuplicates: !get().showDuplicates }),
  toggleShowOutOfBounds: () => set({ showOutOfBounds: !get().showOutOfBounds }),

  updateRecord: (id, patch) => {
    const records = get().records.map((r) =>
      r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r
    );
    persist(records, get().profiles);
    set({ records });
  },

  updateRecordConclusion: (id, conclusion) => {
    get().updateRecord(id, { conclusion });
  },

  getRecordProfiles: (recordId) =>
    get()
      .profiles.filter((p) => p.recordId === recordId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),

  getFilteredRecords: () => {
    const { records, activeCoordinateSystem, filterStatus, showDuplicates, showOutOfBounds } = get();
    return records.filter((r) => {
      if (activeCoordinateSystem !== 'ALL' && r.coordinateSystem !== activeCoordinateSystem) return false;
      if (filterStatus !== 'ALL' && r.reviewStatus !== filterStatus) return false;
      if (!showDuplicates && r.isDuplicate) return false;
      if (!showOutOfBounds && r.isOutOfBounds) return false;
      return true;
    });
  },

  getOutOfBoundsCount: () => get().records.filter((r) => r.isOutOfBounds).length,
  getDuplicateCount: () => get().records.filter((r) => r.isDuplicate).length,

  runDuplicateCheck: () => {
    const { records } = get();
    const scenePts = records.map((r) => ({
      id: r.id,
      pos: transformToScene(r.x, r.y, r.z_m, r.coordinateSystem),
      time: r.timeParam,
    }));
    const updated = records.map((r) => ({ ...r, isDuplicate: false, duplicateOf: undefined as string | undefined }));
    for (let i = 0; i < scenePts.length; i++) {
      for (let j = i + 1; j < scenePts.length; j++) {
        const a = scenePts[i];
        const b = scenePts[j];
        if (a.time === b.time && distance3D(a.pos, b.pos) < DUPLICATE_THRESHOLD) {
          const idxJ = updated.findIndex((r) => r.id === b.id);
          if (idxJ >= 0) {
            updated[idxJ].isDuplicate = true;
            updated[idxJ].duplicateOf = a.id;
          }
        }
      }
    }
    persist(updated, get().profiles);
    set({ records: updated });
  },

  mergeDuplicate: (sourceId, targetId) => {
    const records = get().records.filter((r) => r.id !== sourceId);
    persist(records, get().profiles);
    set({ records });
  },
}));
