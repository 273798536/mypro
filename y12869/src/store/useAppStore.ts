import { create } from 'zustand';
import type {
  ChannelReport, Section, SurveyLine, MeasurePoint,
  TideVersion, ConclusionImpact, Anomaly, AnomalySeverity, AnomalyStatus,
  CleanRuleChain, TrajectorySnapshot, ClippingState, SceneSelection,
  InspectionPhoto, WaterQualityRecord, AquacultureLog,
} from '@/types';
import { buildChannelReport, MOCK_WATER_RECORDS, MOCK_AQUA_LOGS, MOCK_PHOTOS, getMeasurePointsFlat } from '@/services/mock/channelData';
import { CURRENT_TIDE_VERSION, CONCLUSION_IMPACTS, ANOMALIES, DEFAULT_CLEAN_RULE_CHAIN, buildInitialSnapshots } from '@/services/mock/tideData';

interface AppState {
  initialized: boolean;
  report: ChannelReport | null;
  loading: boolean;
  waterRecords: Map<string, WaterQualityRecord>;
  aquaLogs: Map<string, AquacultureLog>;
  photos: InspectionPhoto[];
  scene: {
    selection: SceneSelection;
    clipping: ClippingState | null;
    cameraTarget: [number, number, number];
  };
  tide: {
    currentVersion: TideVersion | null;
    impacts: ConclusionImpact[];
    bannerVisible: boolean;
  };
  cleaning: {
    ruleChain: CleanRuleChain;
    snapshots: TrajectorySnapshot[];
    currentSnapshotIndex: number;
  };
  anomaly: {
    list: Anomaly[];
    filters: { severity?: AnomalySeverity; status?: AnomalyStatus };
    activeAnomalyId: string | null;
  };
  rightPanelTab: 'filter' | 'detail';
}

interface AppActions {
  initialize: () => void;
  setSelectedSections: (ids: string[]) => void;
  setSelectedLines: (ids: string[]) => void;
  setSelectedPoint: (id: string | null) => void;
  setClipping: (c: ClippingState | null) => void;
  setCameraTarget: (t: [number, number, number]) => void;
  toggleTideBanner: () => void;
  toggleRule: (ruleId: string, enabled: boolean) => void;
  updateRuleParam: (ruleId: string, key: string, value: number) => void;
  setCurrentSnapshotIndex: (i: number) => void;
  addInspectionPhoto: (photo: InspectionPhoto) => { newSnapshot: TrajectorySnapshot | null };
  setAnomalyFilters: (f: Partial<AppState['anomaly']['filters']>) => void;
  setActiveAnomaly: (id: string | null) => void;
  advanceDisposalStep: (anomalyId: string, stepId: string, meta?: Record<string, unknown>) => void;
  setRightPanelTab: (t: 'filter' | 'detail') => void;
  syncTideVersion: () => void;
  getPointById: (id: string) => MeasurePoint | null;
  getLineById: (id: string) => SurveyLine | null;
  getSectionById: (id: string) => Section | null;
  getAllPoints: () => MeasurePoint[];
  getFilteredPoints: () => MeasurePoint[];
}

const initialState: AppState = {
  initialized: false,
  report: null,
  loading: true,
  waterRecords: new Map(),
  aquaLogs: new Map(),
  photos: [],
  scene: {
    selection: { selectedSectionIds: [], selectedLineIds: [], selectedPointId: null },
    clipping: null,
    cameraTarget: [5000, 0, 0],
  },
  tide: {
    currentVersion: null,
    impacts: [],
    bannerVisible: true,
  },
  cleaning: {
    ruleChain: DEFAULT_CLEAN_RULE_CHAIN,
    snapshots: [],
    currentSnapshotIndex: 0,
  },
  anomaly: {
    list: [],
    filters: {},
    activeAnomalyId: null,
  },
  rightPanelTab: 'filter',
};

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  ...initialState,

  initialize: () => {
    if (get().initialized) return;
    const report = buildChannelReport();
    set({
      initialized: true,
      report,
      loading: false,
      waterRecords: MOCK_WATER_RECORDS,
      aquaLogs: MOCK_AQUA_LOGS,
      photos: MOCK_PHOTOS,
      tide: { currentVersion: CURRENT_TIDE_VERSION, impacts: CONCLUSION_IMPACTS, bannerVisible: true },
      anomaly: { ...get().anomaly, list: ANOMALIES },
      cleaning: {
        ...get().cleaning,
        snapshots: buildInitialSnapshots(),
      },
      scene: {
        ...get().scene,
        cameraTarget: [report.endMileage / 2, 0, 0],
      },
    });
  },

  setSelectedSections: (ids) => set((s) => ({ scene: { ...s.scene, selection: { ...s.scene.selection, selectedSectionIds: ids, selectedLineIds: [] } } })),
  setSelectedLines: (ids) => set((s) => ({ scene: { ...s.scene, selection: { ...s.scene.selection, selectedLineIds: ids } } })),
  setSelectedPoint: (id) => {
    if (id) set({ rightPanelTab: 'detail' });
    set((s) => ({ scene: { ...s.scene, selection: { ...s.scene.selection, selectedPointId: id } } }));
  },
  setClipping: (c) => set((s) => ({ scene: { ...s.scene, clipping: c } })),
  setCameraTarget: (t) => set((s) => ({ scene: { ...s.scene, cameraTarget: t } })),
  toggleTideBanner: () => set((s) => ({ tide: { ...s.tide, bannerVisible: !s.tide.bannerVisible } })),

  toggleRule: (ruleId, enabled) => set((s) => ({
    cleaning: {
      ...s.cleaning,
      ruleChain: {
        ...s.cleaning.ruleChain,
        rules: s.cleaning.ruleChain.rules.map(r => r.ruleId === ruleId ? { ...r, enabled } : r),
        appliedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      },
    },
  })),

  updateRuleParam: (ruleId, key, value) => set((s) => ({
    cleaning: {
      ...s.cleaning,
      ruleChain: {
        ...s.cleaning.ruleChain,
        rules: s.cleaning.ruleChain.rules.map(r => r.ruleId === ruleId
          ? { ...r, params: { ...r.params, [key]: value } } : r),
        appliedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      },
    },
  })),

  setCurrentSnapshotIndex: (i) => set((s) => ({ cleaning: { ...s.cleaning, currentSnapshotIndex: i } })),

  addInspectionPhoto: (photo) => {
    const state = get();
    const point = photo.relatedPointId ? state.getPointById(photo.relatedPointId) : null;
    let relatedLineId: string | null = null;
    if (point && state.report) {
      outer: for (const sec of state.report.sections) {
        for (const line of sec.surveyLines) {
          if (line.points.some(p => p.pointId === point.pointId)) {
            relatedLineId = line.lineId;
            break outer;
          }
        }
      }
    }
    const snaps = [...state.cleaning.snapshots];
    let newSnapshot: TrajectorySnapshot | null = null;
    if (point && relatedLineId) {
      const idx = snaps.findIndex(s => s.snapshotId.includes(relatedLineId));
      const base = idx >= 0 ? snaps[idx] : null;
      if (base) {
        const ptsBefore = base.pointsAfter;
        const ptsAfter = ptsBefore.map(p => p.pointId === point.pointId
          ? { ...p, correctedDepth: +(p.correctedDepth + 0.05).toFixed(3), photoIds: [...p.photoIds, photo.photoId] }
          : p);
        newSnapshot = {
          snapshotId: `SNAP-${relatedLineId}-PHOTO-${Date.now()}`,
          timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
          chainId: state.cleaning.ruleChain.chainId,
          trigger: 'photoAdded',
          triggerPhotoIds: [photo.photoId],
          pointsBefore: ptsBefore,
          pointsAfter: ptsAfter,
          diffCount: 1,
        };
        if (idx >= 0) snaps.splice(idx + 1, 0, newSnapshot);
        else snaps.push(newSnapshot);
      }
    }
    set({
      photos: [...state.photos, photo],
      cleaning: { ...state.cleaning, snapshots: snaps, currentSnapshotIndex: snaps.length - 1 },
    });
    return { newSnapshot };
  },

  setAnomalyFilters: (f) => set((s) => ({ anomaly: { ...s.anomaly, filters: { ...s.anomaly.filters, ...f } } })),
  setActiveAnomaly: (id) => set((s) => ({ anomaly: { ...s.anomaly, activeAnomalyId: id } })),
  advanceDisposalStep: (anomalyId, stepId, meta) => set((s) => ({
    anomaly: {
      ...s.anomaly,
      list: s.anomaly.list.map(a => {
        if (a.anomalyId !== anomalyId) return a;
        const steps = a.disposalSteps.map(st => {
          if (st.stepId !== stepId) return st;
          return {
            ...st,
            completed: true,
            completedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            meta: meta ? { ...(st.meta || {}), ...meta } : st.meta,
          };
        });
        const allRequired = steps.filter(x => x.required).every(x => x.completed);
        const anyCompleted = steps.some(x => x.completed);
        let status: AnomalyStatus = a.status;
        if (allRequired) status = a.status === 'closed' ? 'closed' : 'reviewing';
        else if (anyCompleted) status = 'processing';
        return { ...a, disposalSteps: steps, status, updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') };
      }),
    },
  })),

  setRightPanelTab: (t) => set({ rightPanelTab: t }),

  syncTideVersion: () => set((s) => ({
    tide: {
      ...s.tide,
      currentVersion: s.tide.currentVersion ? { ...s.tide.currentVersion, status: 'synchronized', delayHours: 0 } : s.tide.currentVersion,
      impacts: [],
    },
  })),

  getPointById: (id) => {
    const r = get().report;
    if (!r) return null;
    for (const sec of r.sections) {
      for (const line of sec.surveyLines) {
        const p = line.points.find(x => x.pointId === id);
        if (p) return p;
      }
    }
    return null;
  },
  getLineById: (id) => {
    const r = get().report;
    if (!r) return null;
    for (const sec of r.sections) {
      const l = sec.surveyLines.find(x => x.lineId === id);
      if (l) return l;
    }
    return null;
  },
  getSectionById: (id) => get().report?.sections.find(s => s.sectionId === id) || null,
  getAllPoints: () => getMeasurePointsFlat(),
  getFilteredPoints: () => {
    const s = get();
    if (!s.report) return [];
    const sel = s.scene.selection;
    const all = s.getAllPoints();
    if (sel.selectedSectionIds.length === 0 && sel.selectedLineIds.length === 0) return all;
    const secSet = new Set(sel.selectedSectionIds);
    const lineSet = new Set(sel.selectedLineIds);
    return all.filter(p => {
      if (lineSet.size > 0) {
        const matchLine = [...lineSet].some(lid => p.pointId.startsWith(lid));
        if (matchLine) return true;
      }
      if (secSet.size > 0) {
        const matchSec = [...secSet].some(sid => p.pointId.startsWith(sid));
        if (matchSec) return true;
      }
      return false;
    });
  },
}));
