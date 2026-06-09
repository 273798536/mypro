import { create } from 'zustand';
import type {
  DataRecord,
  Anomaly,
  HistoryEntry,
  ProfileSnapshot,
  GameSession,
  GameStatus,
  ViewState,
  CollisionEvent,
} from '../types';
import {
  generateMockData,
  createProfileSnapshot,
  createHistoryEntry,
  createAnomaly,
  createCollisionEvent,
  generateId,
  detectAnomalies,
} from '../utils/data';

interface AppState {
  records: DataRecord[];
  anomalies: Anomaly[];
  history: HistoryEntry[];
  snapshots: ProfileSnapshot[];
  session: GameSession | null;
  view: ViewState;
  selectedRecordId: string | null;
  hoveredRecordId: string | null;

  initMockData: () => void;
  importData: (data: DataRecord[]) => void;
  updateRecords: (records: DataRecord[]) => void;

  setView: (view: Partial<ViewState>) => void;
  saveViewSnapshot: () => void;
  restoreView: (index: number) => void;

  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetGame: () => void;
  finishGame: () => void;
  startReview: () => void;

  selectRecord: (id: string | null) => void;
  hoverRecord: (id: string | null) => void;
  markAnomaly: (recordId: string) => void;
  reviewAnomaly: (anomalyId: string, status: 'confirmed' | 'dismissed', user: string, reason: string) => void;

  addCollisionEvent: (recordId: string, type: CollisionEvent['type'], details: string) => void;
  saveSnapshot: (label: string) => void;

  getRecordsByStatus: (status: 'all' | 'normal' | 'anomaly' | 'pending' | 'confirmed' | 'dismissed') => DataRecord[];
  getAnomalyForRecord: (recordId: string) => Anomaly | undefined;
  getHistoryForAnomaly: (anomalyId: string) => HistoryEntry[];
}

const initialView: ViewState = {
  offsetX: -10,
  offsetY: -10,
  scale: 5,
};

export const useAppStore = create<AppState>((set, get) => ({
  records: [],
  anomalies: [],
  history: [],
  snapshots: [],
  session: null,
  view: initialView,
  selectedRecordId: null,
  hoveredRecordId: null,

  initMockData: () => {
    const mockData = generateMockData(120);
    const snapshots = [createProfileSnapshot(mockData, 1, '初始剖面图')];
    set({ records: mockData, snapshots });
  },

  importData: (data: DataRecord[]) => {
    const processed = detectAnomalies(data);
    const snapshot = createProfileSnapshot(processed, get().snapshots.length + 1, '导入数据');
    set((state) => ({
      records: processed,
      snapshots: [...state.snapshots, snapshot],
    }));
  },

  updateRecords: (records: DataRecord[]) => {
    set({ records });
  },

  setView: (view) => {
    set((state) => ({ view: { ...state.view, ...view } }));
  },

  saveViewSnapshot: () => {
    const { view, session } = get();
    if (session) {
      set({
        session: {
          ...session,
          viewSnapshots: [...session.viewSnapshots, { ...view }],
        },
      });
    }
  },

  restoreView: (index: number) => {
    const { session } = get();
    if (session && session.viewSnapshots[index]) {
      set({ view: { ...session.viewSnapshots[index] } });
    }
  },

  startGame: () => {
    const { records } = get();
    const session: GameSession = {
      id: generateId(),
      startTime: Date.now(),
      status: 'running',
      processedRecords: [],
      collisionEvents: [],
      viewSnapshots: [{ ...get().view }],
      score: 0,
    };
    const anomalies = records.filter((r) => r.isAnomaly).map((r) => createAnomaly(r.id));
    const history = anomalies.map((a) =>
      createHistoryEntry(a.id, 'created', '系统检测', '自动检测到异常离群点')
    );
    set({ session, anomalies, history });
  },

  pauseGame: () => {
    set((state) =>
      state.session ? { session: { ...state.session, status: 'paused' } } : state
    );
  },

  resumeGame: () => {
    set((state) =>
      state.session ? { session: { ...state.session, status: 'running' } } : state
    );
  },

  resetGame: () => {
    set({
      session: null,
      selectedRecordId: null,
      hoveredRecordId: null,
      view: initialView,
    });
  },

  finishGame: () => {
    set((state) =>
      state.session
        ? {
            session: {
              ...state.session,
              status: 'finished',
              endTime: Date.now(),
            },
          }
        : state
    );
  },

  startReview: () => {
    set((state) =>
      state.session ? { session: { ...state.session, status: 'reviewing' } } : state
    );
  },

  selectRecord: (id) => {
    set({ selectedRecordId: id });
  },

  hoverRecord: (id) => {
    set({ hoveredRecordId: id });
  },

  markAnomaly: (recordId) => {
    const { anomalies, history, session } = get();
    if (anomalies.find((a) => a.recordId === recordId)) return;

    const anomaly = createAnomaly(recordId);
    const entry = createHistoryEntry(anomaly.id, 'created', '物理老师', '手动标记为异常');
    set({
      anomalies: [...anomalies, anomaly],
      history: [...history, entry],
      session: session
        ? {
            ...session,
            processedRecords: [...session.processedRecords, recordId],
            score: session.score + 10,
          }
        : session,
    });
  },

  reviewAnomaly: (anomalyId, status, user, reason) => {
    const { anomalies, history, session, records } = get();
    const updated = anomalies.map((a) =>
      a.id === anomalyId
        ? { ...a, status, reviewer: user, comment: reason, reviewedAt: Date.now() }
        : a
    );
    const entry = createHistoryEntry(anomalyId, status, user, reason);

    let newRecords = records;
    if (status === 'dismissed') {
      const anomaly = anomalies.find((a) => a.id === anomalyId);
      if (anomaly) {
        newRecords = records.map((r) =>
          r.id === anomaly.recordId ? { ...r, isAnomaly: false } : r
        );
      }
    }

    set({
      anomalies: updated,
      history: [...history, entry],
      records: newRecords,
      session: session
        ? {
            ...session,
            score: session.score + (status === 'confirmed' ? 20 : 5),
          }
        : session,
    });
  },

  addCollisionEvent: (recordId, type, details) => {
    const { session } = get();
    if (!session) return;
    if (session.collisionEvents.find((c) => c.recordId === recordId && c.type === type)) return;
    set({
      session: {
        ...session,
        collisionEvents: [...session.collisionEvents, createCollisionEvent(recordId, type, details)],
      },
    });
  },

  saveSnapshot: (label) => {
    const { records, snapshots } = get();
    const snapshot = createProfileSnapshot(records, snapshots.length + 1, label);
    set({ snapshots: [...snapshots, snapshot] });
  },

  getRecordsByStatus: (status) => {
    const { records, anomalies } = get();
    switch (status) {
      case 'all':
        return records;
      case 'normal':
        return records.filter((r) => !r.isAnomaly);
      case 'anomaly':
        return records.filter((r) => r.isAnomaly);
      case 'pending':
      case 'confirmed':
      case 'dismissed': {
        const targetIds = anomalies.filter((a) => a.status === status).map((a) => a.recordId);
        return records.filter((r) => targetIds.includes(r.id));
      }
      default:
        return records;
    }
  },

  getAnomalyForRecord: (recordId) => {
    return get().anomalies.find((a) => a.recordId === recordId);
  },

  getHistoryForAnomaly: (anomalyId) => {
    return get().history.filter((h) => h.anomalyId === anomalyId).sort((a, b) => b.timestamp - a.timestamp);
  },
}));
