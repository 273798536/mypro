import { create } from 'zustand';
import type {
  Measurement,
  Conclusion,
  AuditEntry,
  ParameterSet,
  SystemSnapshot,
  GamePhase,
  PointCloudSlice,
  IceModel3D,
  SyncIssue,
  Operator,
  OutlierReview,
} from '../types';
import {
  scenarioConfig,
  oldParameters,
  operators,
} from '../data/mockData';

interface AppState {
  phase: GamePhase;
  currentTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
  startTime: number;
  endTime: number;

  measurements: Measurement[];
  slices: PointCloudSlice[];
  models: IceModel3D[];
  conclusions: Conclusion[];
  auditRecords: AuditEntry[];
  parameters: ParameterSet;
  oldParameters: ParameterSet;
  syncIssues: SyncIssue[];
  operators: Operator[];

  selectedSliceId: string | null;
  selectedMeasurementId: string | null;
  showParameterDiff: boolean;
  showConclusionDiff: boolean;
  activeTab: '3d' | 'slices' | 'audit' | 'sync' | 'conclusion';

  snapshots: SystemSnapshot[];
  currentSnapshotId: string | null;

  setPhase: (phase: GamePhase) => void;
  setCurrentTime: (time: number) => void;
  togglePlay: () => void;
  setPlaybackSpeed: (speed: number) => void;
  reset: () => void;
  settle: () => void;
  startReview: () => void;

  selectSlice: (id: string | null) => void;
  selectMeasurement: (id: string | null) => void;
  toggleParameterDiff: () => void;
  toggleConclusionDiff: () => void;
  setActiveTab: (tab: AppState['activeTab']) => void;

  reviewOutlier: (
    measurementId: string,
    decision: OutlierReview['decision'],
    reason: string,
    newValue?: number
  ) => void;

  createSnapshot: () => void;
  restoreSnapshot: (id: string) => void;
}

const initialMeasurements = scenarioConfig.materials.measurements.map(m => ({ ...m }));
const initialConclusions = scenarioConfig.conclusions.map(c => ({ ...c }));
const initialAudit = [...scenarioConfig.auditRecords];

export const useAppStore = create<AppState>((set, get) => ({
  phase: 'idle',
  currentTime: scenarioConfig.timeRange.start.getTime(),
  isPlaying: false,
  playbackSpeed: 1,
  startTime: scenarioConfig.timeRange.start.getTime(),
  endTime: scenarioConfig.timeRange.end.getTime(),

  measurements: initialMeasurements,
  slices: scenarioConfig.materials.slices,
  models: scenarioConfig.materials.models,
  conclusions: initialConclusions,
  auditRecords: initialAudit,
  parameters: scenarioConfig.parameters,
  oldParameters,
  syncIssues: scenarioConfig.syncIssues,
  operators,

  selectedSliceId: 'slice-003',
  selectedMeasurementId: null,
  showParameterDiff: true,
  showConclusionDiff: true,
  activeTab: '3d',

  snapshots: [],
  currentSnapshotId: null,

  setPhase: (phase) => set({ phase }),
  setCurrentTime: (time) => set({ currentTime: time }),
  togglePlay: () => {
    const { isPlaying, phase } = get();
    const newPhase = phase === 'idle' ? 'playing' : phase;
    set({ isPlaying: !isPlaying, phase: isPlaying ? 'paused' : 'playing' });
    if (phase === 'idle') {
      set({ phase: 'playing' });
    }
  },
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  reset: () => set({
    phase: 'idle',
    currentTime: scenarioConfig.timeRange.start.getTime(),
    isPlaying: false,
    measurements: scenarioConfig.materials.measurements.map(m => ({ ...m })),
    conclusions: scenarioConfig.conclusions.map(c => ({ ...c })),
    auditRecords: [...scenarioConfig.auditRecords],
    selectedMeasurementId: null,
    currentSnapshotId: null,
  }),
  settle: () => {
    const { createSnapshot } = get();
    createSnapshot();
    set({ phase: 'settled', isPlaying: false });
  },
  startReview: () => set({ phase: 'reviewing', isPlaying: false }),

  selectSlice: (id) => set({ selectedSliceId: id }),
  selectMeasurement: (id) => set({ selectedMeasurementId: id }),
  toggleParameterDiff: () => set((s) => ({ showParameterDiff: !s.showParameterDiff })),
  toggleConclusionDiff: () => set((s) => ({ showConclusionDiff: !s.showConclusionDiff })),
  setActiveTab: (tab) => set({ activeTab: tab }),

  reviewOutlier: (measurementId, decision, reason, newValue) => {
    const state = get();
    const operator = state.operators[2];
    const now = new Date();

    const measurement = state.measurements.find(m => m.id === measurementId);
    if (!measurement) return;

    const updatedMeasurements = state.measurements.map(m => {
      if (m.id !== measurementId) return m;
      const review: OutlierReview = {
        reviewedBy: operator,
        reviewedAt: now,
        decision,
        newValue,
        reason,
        impactScope: state.conclusions.map(c => c.id),
      };
      const reviewStatus: 'pending' | 'approved' | 'rejected' | 'modified' = decision === 'remove' ? 'rejected' : decision === 'modify' ? 'modified' : 'approved';
      return {
        ...m,
        outlierReviewStatus: reviewStatus,
        thickness: newValue !== undefined ? newValue : m.thickness,
        isOutlier: decision === 'keep',
        outlierReview: review,
      };
    });

    const auditEntry: AuditEntry = {
      id: `audit-${Date.now()}`,
      timestamp: now,
      operator,
      operation: {
        type: 'review',
        target: {
          type: 'measurement',
          id: measurementId,
          name: `测量点 ${measurementId.split('-')[1]}`,
        },
      },
      changes: [
        { field: 'outlierReviewStatus', before: measurement.outlierReviewStatus || 'pending', after: decision === 'remove' ? 'rejected' : decision === 'modify' ? 'modified' : 'approved' },
        { field: 'outlierReview.decision', before: null, after: decision },
        ...(newValue !== undefined ? [{ field: 'thickness', before: measurement.thickness, after: newValue }] : []),
      ],
      reason,
      impactScope: state.conclusions.map(c => c.id),
    };

    set({
      measurements: updatedMeasurements,
      auditRecords: [auditEntry, ...state.auditRecords],
    });
  },

  createSnapshot: () => {
    const state = get();
    const snapshot: SystemSnapshot = {
      id: `snap-${Date.now()}`,
      timestamp: new Date(state.currentTime),
      measurements: state.measurements.map(m => ({ ...m })),
      conclusions: state.conclusions.map(c => ({ ...c })),
      parameters: { ...state.parameters },
      auditCount: state.auditRecords.length,
    };
    set({
      snapshots: [...state.snapshots, snapshot],
      currentSnapshotId: snapshot.id,
    });
  },

  restoreSnapshot: (id) => {
    const state = get();
    const snapshot = state.snapshots.find(s => s.id === id);
    if (!snapshot) return;
    set({
      measurements: snapshot.measurements.map(m => ({ ...m })),
      conclusions: snapshot.conclusions.map(c => ({ ...c })),
      parameters: { ...snapshot.parameters },
      currentTime: snapshot.timestamp.getTime(),
      currentSnapshotId: id,
    });
  },
}));
