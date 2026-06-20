import { create } from 'zustand';
import type { Snapshot, Sample, ManualOverride, MetricResult, MetricConfig, GatekeeperState } from '@/types';
import { METRIC_CONFIGS, computeAllMetrics } from '@/utils/metrics';
import { getDemoCurrentSnapshot, getDemoSnapshotHistory } from '@/data/demoData';

interface GatekeeperStore extends GatekeeperState {
  init: () => void;
  toggleDemoMode: () => void;
  setThreshold: (metricKey: string, value: number) => void;
  selectSample: (sample: Sample | null) => void;
  openOverrideModal: (target: string) => void;
  closeOverrideModal: () => void;
  applyOverride: (params: { target: string; oldPassed: boolean; newPassed: boolean; reason: string }) => void;
  loadSnapshot: (snapshot: Snapshot) => void;
  recomputeMetrics: () => void;
  customThresholds: Record<string, number>;
}

const STORAGE_KEY = 'gatekeeper_overrides_v1';

function loadPersistedOverrides(): Record<string, ManualOverride[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistOverrides(data: Record<string, ManualOverride[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export const useGatekeeperStore = create<GatekeeperStore>((set, get) => ({
  isDemoMode: true,
  currentSnapshot: null,
  snapshotHistory: [],
  metricConfigs: METRIC_CONFIGS,
  metricResults: [],
  overallPassed: false,
  hasOverride: false,
  selectedSample: null,
  showOverrideModal: false,
  overrideTarget: null,
  customThresholds: {},

  init: () => {
    const current = getDemoCurrentSnapshot();
    const history = getDemoSnapshotHistory();
    const persisted = loadPersistedOverrides();
    const snapWithPersisted: Snapshot = {
      ...current,
      overrides: [...(current.overrides || []), ...(persisted[current.id] || [])],
    };
    const results = computeAllMetrics(snapWithPersisted.samples, METRIC_CONFIGS, get().customThresholds);
    const allPassed = results.every((r) => r.isPassed);
    set({
      currentSnapshot: snapWithPersisted,
      snapshotHistory: history,
      metricResults: results,
      overallPassed: allPassed || snapWithPersisted.overrides.length > 0,
      hasOverride: snapWithPersisted.overrides.length > 0,
    });
  },

  toggleDemoMode: () => {
    set((s) => ({ isDemoMode: !s.isDemoMode }));
    get().init();
  },

  setThreshold: (metricKey: string, value: number) => {
    set((s) => {
      const newThresholds = { ...s.customThresholds, [metricKey]: value };
      const results = computeAllMetrics(s.currentSnapshot?.samples || [], s.metricConfigs, newThresholds);
      const allPassed = results.every((r) => r.isPassed);
      return {
        customThresholds: newThresholds,
        metricResults: results,
        overallPassed: allPassed || s.hasOverride,
      };
    });
  },

  selectSample: (sample) => set({ selectedSample: sample }),

  openOverrideModal: (target) => set({ showOverrideModal: true, overrideTarget: target }),

  closeOverrideModal: () => set({ showOverrideModal: false, overrideTarget: null }),

  applyOverride: ({ target, oldPassed, newPassed, reason }) => {
    const snap = get().currentSnapshot;
    if (!snap) return;
    const override: ManualOverride = {
      id: `over_${Date.now()}`,
      snapshotId: snap.id,
      metricName: target,
      oldValue: oldPassed ? '通过' : '不通过',
      newValue: newPassed ? '通过' : '不通过',
      oldPassed,
      newPassed,
      reason,
      operator: '小林',
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    };
    const newOverrides = [...snap.overrides, override];
    const persisted = loadPersistedOverrides();
    persisted[snap.id] = newOverrides;
    persistOverrides(persisted);
    set((s) => ({
      currentSnapshot: s.currentSnapshot ? { ...s.currentSnapshot, overrides: newOverrides } : null,
      hasOverride: true,
      overallPassed: newPassed ? true : s.overallPassed,
      showOverrideModal: false,
      overrideTarget: null,
    }));
  },

  loadSnapshot: (snapshot: Snapshot) => {
    const results = computeAllMetrics(snapshot.samples, METRIC_CONFIGS, get().customThresholds);
    const allPassed = results.every((r) => r.isPassed);
    set({
      currentSnapshot: snapshot,
      metricResults: results,
      overallPassed: allPassed || snapshot.overrides.length > 0,
      hasOverride: snapshot.overrides.length > 0,
    });
  },

  recomputeMetrics: () => {
    const snap = get().currentSnapshot;
    if (!snap) return;
    const results = computeAllMetrics(snap.samples, get().metricConfigs, get().customThresholds);
    const allPassed = results.every((r) => r.isPassed);
    set({
      metricResults: results,
      overallPassed: allPassed || get().hasOverride,
    });
  },
}));
