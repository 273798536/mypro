import { create } from 'zustand';
import type {
  Anomaly,
  ViewSnapshot,
  FilterConditions,
  ReviewResult,
  CameraState,
} from '@/types';
import {
  generateReviewResult,
  filterReviewResult,
  MOCK_SNAPSHOTS,
} from '@/data/mockData';

const STORAGE_KEY = 'bridge-tunnel-review:v1';

interface ReviewStore {
  baseResult: ReviewResult;
  filteredResult: ReviewResult;
  filters: FilterConditions;
  snapshots: ViewSnapshot[];
  selectedRecordId: string | null;
  cameraState: CameraState;
  cameraRestoredAt: number;
  isScreenshotMode: boolean;
  screenshotNote: string;
  activeAnomalyTab: 'name_mismatch' | 'floor_unit_mixed';
  snapshotStatus: { isSaving: boolean; error: string | null };

  setFilters: (filters: Partial<FilterConditions>) => void;
  loadSample: () => void;
  rerunReview: () => void;
  selectRecord: (id: string | null) => void;
  setCameraState: (state: CameraState) => void;
  saveSnapshot: (name: string, screenshotDataUrl?: string) => void;
  deleteSnapshot: (snapshotId: string) => void;
  restoreSnapshot: (snapshotId: string) => void;
  setSnapshotStatus: (status: Partial<{ isSaving: boolean; error: string | null }>) => void;
  toggleScreenshotMode: () => void;
  setScreenshotNote: (note: string) => void;
  setActiveAnomalyTab: (tab: 'name_mismatch' | 'floor_unit_mixed') => void;
  linkAnomalyConclusion: (anomalyId: string, conclusion: string) => void;
}

const defaultFilters: FilterConditions = {
  timeRange: null,
  area: null,
  materialType: null,
  showOnlyAnomaly: false,
};

const defaultCamera: CameraState = {
  position: [10, 6, 10],
  target: [0, 0, 0],
  fov: 50,
};

function loadFromStorage(): { snapshots: ViewSnapshot[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
    };
  } catch {
    return null;
  }
}

function persistToStorage(snapshots: ViewSnapshot[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        snapshots,
        savedAt: Date.now(),
      }),
    );
  } catch (err) {
    console.warn('[persist] 快照持久化失败：', err);
  }
}

function recompute(base: ReviewResult, filters: FilterConditions): ReviewResult {
  return filterReviewResult(base, filters);
}

const persisted = loadFromStorage();
const initialSnapshots = persisted && persisted.snapshots.length > 0
  ? persisted.snapshots
  : MOCK_SNAPSHOTS;

export const useReviewStore = create<ReviewStore>((set, get) => ({
  baseResult: { records: [], anomalies: [], stats: { total: 0, anomalyCount: 0, nameMismatchCount: 0, floorUnitMixedCount: 0 } },
  filteredResult: { records: [], anomalies: [], stats: { total: 0, anomalyCount: 0, nameMismatchCount: 0, floorUnitMixedCount: 0 } },
  filters: defaultFilters,
  snapshots: initialSnapshots,
  selectedRecordId: null,
  cameraState: defaultCamera,
  cameraRestoredAt: 0,
  isScreenshotMode: false,
  screenshotNote: '',
  activeAnomalyTab: 'name_mismatch',
  snapshotStatus: { isSaving: false, error: null },

  setFilters: (partial) => {
    const next = { ...get().filters, ...partial };
    const filtered = recompute(get().baseResult, next);
    set({ filters: next, filteredResult: filtered });
  },

  loadSample: () => {
    const base = generateReviewResult();
    const filtered = recompute(base, defaultFilters);
    set({
      baseResult: base,
      filteredResult: filtered,
      filters: defaultFilters,
      selectedRecordId: null,
      cameraState: defaultCamera,
      cameraRestoredAt: Date.now(),
    });
  },

  rerunReview: () => {
    const base = generateReviewResult();
    const filtered = recompute(base, get().filters);
    set({ baseResult: base, filteredResult: filtered, selectedRecordId: null });
  },

  selectRecord: (id) => set({ selectedRecordId: id }),

  setCameraState: (state) => set({ cameraState: state }),

  setSnapshotStatus: (status) =>
    set({ snapshotStatus: { ...get().snapshotStatus, ...status } }),

  saveSnapshot: (name, screenshotDataUrl) => {
    const snap: ViewSnapshot = {
      id: `snap-${Date.now()}`,
      name,
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
      filterConditions: { ...get().filters },
      cameraState: { ...get().cameraState },
      screenshotDataUrl,
    };
    const next = [snap, ...get().snapshots];
    set({ snapshots: next, snapshotStatus: { isSaving: false, error: null } });
    persistToStorage(next);
  },

  deleteSnapshot: (snapshotId) => {
    const next = get().snapshots.filter((s) => s.id !== snapshotId);
    set({ snapshots: next });
    persistToStorage(next);
  },

  restoreSnapshot: (snapshotId) => {
    const snap = get().snapshots.find((s) => s.id === snapshotId);
    if (!snap) {
      set({ snapshotStatus: { isSaving: false, error: '快照不存在，可能已被删除' } });
      return;
    }
    const filtered = recompute(get().baseResult, snap.filterConditions);
    set({
      filters: snap.filterConditions,
      cameraState: snap.cameraState,
      cameraRestoredAt: Date.now(),
      filteredResult: filtered,
      selectedRecordId: null,
      snapshotStatus: { isSaving: false, error: null },
    });
  },

  toggleScreenshotMode: () => set({ isScreenshotMode: !get().isScreenshotMode }),

  setScreenshotNote: (note) => set({ screenshotNote: note }),

  setActiveAnomalyTab: (tab) => set({ activeAnomalyTab: tab }),

  linkAnomalyConclusion: (anomalyId, conclusion) => {
    const update = (list: Anomaly[]) =>
      list.map((a) => (a.id === anomalyId ? { ...a, linkedConclusion: conclusion } : a));
    set({
      baseResult: { ...get().baseResult, anomalies: update(get().baseResult.anomalies) },
      filteredResult: { ...get().filteredResult, anomalies: update(get().filteredResult.anomalies) },
    });
  },
}));
