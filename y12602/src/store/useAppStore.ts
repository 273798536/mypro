import { create } from 'zustand';
import { AppStore, ActionLog, Material, Point, AuditReport, AnomalyType, MaterialStatus } from '@/types';
import { generateId } from '@/utils/hash';
import { generateReport } from '@/utils/report';
import { PRESET_ROUTE } from '@/data/mockMap';

const initialState = {
  gameStatus: 'idle' as const,
  gameSessionId: generateId(),
  currentRound: 1,
  startTime: null as number | null,
  pauseTime: 0,
  totalPausedDuration: 0,
  routePoints: [...PRESET_ROUTE],
  actionLogs: [] as ActionLog[],
  redoStack: [] as ActionLog[],
  materials: [] as Material[],
  currentReport: null as AuditReport | null,
  selectedMaterialId: null as string | null,
  isReplaying: false,
  replayIndex: 0,
  showReplayModal: false,
  showReportModal: false,
  showMaterialViewer: false,
  showAnomalyDetail: null as string | null,
};

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialState,

  getElapsedTime: () => {
    const state = get();
    if (state.startTime === null) return 0;
    const now = state.gameStatus === 'paused' ? state.pauseTime : Date.now();
    return now - state.startTime - state.totalPausedDuration;
  },

  canUndo: false,
  canRedo: false,

  startGame: () => {
    set({
      gameStatus: 'playing',
      startTime: Date.now(),
      pauseTime: 0,
      totalPausedDuration: 0,
      actionLogs: [],
      redoStack: [],
    });
  },

  pauseGame: () => {
    if (get().gameStatus !== 'playing') return;
    set({
      gameStatus: 'paused',
      pauseTime: Date.now(),
    });
  },

  resumeGame: () => {
    const state = get();
    if (state.gameStatus !== 'paused') return;
    const pausedDuration = Date.now() - state.pauseTime;
    set({
      gameStatus: 'playing',
      totalPausedDuration: state.totalPausedDuration + pausedDuration,
    });
  },

  resetGame: () => {
    set({
      ...initialState,
      gameSessionId: generateId(),
      currentRound: get().currentRound + 1,
      materials: get().materials.map(m => ({ ...m, status: 'pending' as const, relatedLogId: undefined })),
    });
  },

  finishGame: () => {
    const state = get();
    if (state.startTime === null) return;
    
    const endTime = Date.now();
    const report = generateReport(
      state.startTime,
      endTime,
      state.actionLogs,
      state.materials,
      state.gameSessionId
    );
    
    set({
      gameStatus: 'finished',
      currentReport: report,
      showReportModal: true,
    });
  },

  addPoint: (point: Point) => {
    if (get().gameStatus !== 'playing') return;
    
    const log: ActionLog = {
      id: generateId(),
      type: 'update_route',
      point,
      description: `更新路线点 (${point.x}, ${point.y})`,
      timestamp: Date.now(),
      operator: '文保讲解员',
      tracePoints: [],
    };

    set(state => ({
      routePoints: [...state.routePoints, point],
      actionLogs: [...state.actionLogs, log],
      redoStack: [],
    }));
  },

  markHit: (payload) => {
    if (get().gameStatus !== 'playing') return;
    
    const log: ActionLog = {
      id: generateId(),
      type: 'mark_hit',
      point: payload.point,
      materialId: payload.materialId,
      description: payload.description,
      timestamp: Date.now(),
      operator: '文保讲解员',
      tracePoints: get()
        .routePoints
        .slice(-5)
        .map(p => ({ ...p })),
    };

    set(state => ({
      actionLogs: [...state.actionLogs, log],
      redoStack: [],
      materials: state.materials.map(m => 
        m.id === payload.materialId 
          ? { ...m, status: 'hit' as const, relatedLogId: log.id }
          : m
      ),
    }));
  },

  markAnomaly: (payload) => {
    if (get().gameStatus !== 'playing') return;
    
    const log: ActionLog = {
      id: generateId(),
      type: 'mark_anomaly',
      point: payload.point,
      materialId: payload.materialId,
      anomalyType: payload.anomalyType as AnomalyType,
      description: payload.description,
      timestamp: Date.now(),
      operator: '文保讲解员',
      tracePoints: get()
        .routePoints
        .slice(-5)
        .map(p => ({ ...p })),
      opinion: payload.opinion,
    };

    set(state => ({
      actionLogs: [...state.actionLogs, log],
      redoStack: [],
      materials: state.materials.map(m => 
        m.id === payload.materialId 
          ? { ...m, status: 'anomaly' as const, relatedLogId: log.id }
          : m
      ),
    }));
  },

  undo: () => {
    const state = get();
    if (state.actionLogs.length === 0) return;
    
    const lastLog = state.actionLogs[state.actionLogs.length - 1];
    const newLogs = state.actionLogs.slice(0, -1);
    const newRoutePoints = lastLog.type === 'update_route' && lastLog.point
      ? state.routePoints.filter(p => p.timestamp !== lastLog.point!.timestamp)
      : state.routePoints;

    let newMaterials = state.materials;
    if (lastLog.materialId) {
      newMaterials = state.materials.map(m =>
        m.id === lastLog.materialId
          ? { ...m, status: 'pending' as const, relatedLogId: undefined }
          : m
      );
    }

    set({
      actionLogs: newLogs,
      redoStack: [...state.redoStack, lastLog],
      routePoints: newRoutePoints,
      materials: newMaterials,
    });
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return;
    
    const redoLog = state.redoStack[state.redoStack.length - 1];
    const newRedoStack = state.redoStack.slice(0, -1);
    const newRoutePoints = redoLog.type === 'update_route' && redoLog.point
      ? [...state.routePoints, redoLog.point]
      : state.routePoints;

    let newMaterials = state.materials;
    if (redoLog.materialId) {
      const newStatus: MaterialStatus = redoLog.type === 'mark_hit' ? 'hit' : 
        redoLog.type === 'mark_anomaly' ? 'anomaly' : 'pending';
      newMaterials = state.materials.map(m =>
        m.id === redoLog.materialId
          ? { ...m, status: newStatus, relatedLogId: redoLog.id }
          : m
      );
    }

    set({
      actionLogs: [...state.actionLogs, redoLog],
      redoStack: newRedoStack,
      routePoints: newRoutePoints,
      materials: newMaterials,
    });
  },

  importMaterials: (materials) => {
    set(state => ({
      materials: [...state.materials, ...materials],
    }));
  },

  selectMaterial: (id) => {
    set({ selectedMaterialId: id });
  },

  startReplay: () => {
    set({ isReplaying: true, replayIndex: 0, showReplayModal: true });
  },

  stopReplay: () => {
    set({ isReplaying: false, showReplayModal: false });
  },

  setReplayIndex: (index) => {
    set({ replayIndex: index });
  },

  clearReport: () => {
    set({ currentReport: null, showReportModal: false });
  },

  setShowReplayModal: (show) => {
    set({ showReplayModal: show });
  },

  setShowReportModal: (show) => {
    set({ showReportModal: show });
  },

  setShowMaterialViewer: (show) => {
    set({ showMaterialViewer: show });
  },

  setShowAnomalyDetail: (logId) => {
    set({ showAnomalyDetail: logId });
  },

  updateMaterialStatus: (id, status, logId) => {
    set(state => ({
      materials: state.materials.map(m =>
        m.id === id
          ? { ...m, status, relatedLogId: logId }
          : m
      ),
    }));
  },

  removeMaterial: (id) => {
    set(state => ({
      materials: state.materials.filter(m => m.id !== id),
    }));
  },
}));

useAppStore.subscribe((state) => {
  useAppStore.setState({
    canUndo: state.actionLogs.length > 0,
    canRedo: state.redoStack.length > 0,
  });
});
