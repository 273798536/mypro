import { create } from 'zustand';
import type {
  GameSession,
  SectionParams,
  OutlierMark,
  AuditLog,
  UserRole,
  AuditAction,
  BoundaryScene,
  SectionResult,
} from '@/types';
import { genId } from '@/utils/storage';
import { generateFrames, getDefaultSectionParams } from '@/utils/pointCloudGenerator';
import { getSceneAtFrame, USERS } from '@/utils/boundaryScenes';
import { computeSectionResult, paramsEqual, paramDiff } from '@/utils/sectionMath';

interface GameState extends GameSession {
  currentUser: { name: string; role: UserRole; avatar: string };
  lastSectionResult: SectionResult | null;
  selectedPointId: string | null;

  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetGame: () => void;
  finishGame: () => void;

  setCurrentFrame: (frame: number) => void;
  advanceFrame: () => void;
  setPlaySpeed: (speed: number) => void;

  setParams: (params: Partial<SectionParams>, reason?: string) => void;
  setRole: (role: UserRole) => void;
  setSelectedPoint: (id: string | null) => void;

  markOutlier: (pointId: string, reason?: string) => void;
  unmarkOutlier: (markId: string) => void;
  reviewOutlier: (markId: string, approved: boolean, reason: string) => void;

  addAuditLog: (
    action: AuditAction,
    beforeValue: Record<string, unknown>,
    afterValue: Record<string, unknown>,
    reason?: string
  ) => void;
}

function createInitialState(): GameSession {
  const frames = generateFrames(30);
  return {
    id: genId('sess_'),
    status: 'idle',
    currentFrame: 0,
    totalFrames: frames.length,
    startTime: null,
    endTime: null,
    result: null,
    playSpeed: 1,
    currentRole: 'operator',
    currentParams: getDefaultSectionParams(),
    paramHistory: [],
    outlierMarks: [],
    auditLogs: [],
    frames,
    activeBoundaryScene: null,
    detectedSyncIssues: [],
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  ...createInitialState(),
  currentUser: USERS[0],
  lastSectionResult: null,
  selectedPointId: null,

  startGame: () => {
    const now = Date.now();
    const initialParams = getDefaultSectionParams();
    const frames = generateFrames(30);
    const initialPoints = frames[0].points;
    const result = computeSectionResult(initialPoints, initialParams);

    set({
      id: genId('sess_'),
      status: 'playing',
      currentFrame: 0,
      totalFrames: frames.length,
      startTime: now,
      endTime: null,
      result: null,
      currentParams: initialParams,
      paramHistory: [
        {
          params: { ...initialParams },
          timestamp: now,
          operator: USERS[0].name,
          reason: '初始参数',
          sectionResult: result,
        },
      ],
      outlierMarks: [],
      auditLogs: [
        {
          id: genId('log_'),
          action: 'game_start',
          operator: USERS[0].name,
          role: USERS[0].role,
          timestamp: now,
          reason: '开始新一局训练',
          beforeValue: {},
          afterValue: { status: 'playing' },
        },
      ],
      frames,
      activeBoundaryScene: null,
      detectedSyncIssues: [],
      lastSectionResult: result,
      selectedPointId: null,
    });
  },

  pauseGame: () => {
    const state = get();
    if (state.status !== 'playing') return;
    set({ status: 'paused' });
    get().addAuditLog('game_pause', { status: 'playing' }, { status: 'paused' }, '手动暂停');
  },

  resumeGame: () => {
    const state = get();
    if (state.status !== 'paused') return;
    set({ status: 'playing' });
  },

  resetGame: () => {
    const initial = createInitialState();
    set({
      ...initial,
      currentUser: get().currentUser,
      lastSectionResult: null,
      selectedPointId: null,
    });
  },

  finishGame: () => {
    const state = get();
    const now = Date.now();
    const approvedCount = state.outlierMarks.filter((m) => m.status === 'approved').length;
    const pendingCount = state.outlierMarks.filter((m) => m.status === 'pending').length;
    const actualOutliers = state.frames[state.currentFrame]?.points.filter((p) => p.isOutlier).length || 0;
    const correct = approvedCount >= Math.max(1, actualOutliers - 1) && pendingCount === 0;

    set({
      status: 'finished',
      endTime: now,
      result: correct ? 'correct' : 'wrong',
    });

    get().addAuditLog(
      'game_finish',
      { status: state.status },
      { status: 'finished', result: correct ? 'correct' : 'wrong' },
      correct ? '本局判定通过：离群点标记与复核完整' : '本局判定未通过：存在未复核或漏检离群点'
    );
  },

  setCurrentFrame: (frame: number) => {
    const state = get();
    const clamped = Math.max(0, Math.min(state.totalFrames - 1, frame));
    const scene = getSceneAtFrame(clamped);
    const currentPoints = state.frames[clamped]?.points || [];
    const result = computeSectionResult(currentPoints, state.currentParams);

    const issues = [...state.detectedSyncIssues];
    if (scene && !issues.includes(scene.id)) {
      issues.push(scene.id);
    }

    set({
      currentFrame: clamped,
      activeBoundaryScene: scene,
      detectedSyncIssues: issues,
      lastSectionResult: result,
    });
  },

  advanceFrame: () => {
    const state = get();
    if (state.status !== 'playing') return;
    const next = state.currentFrame + 1;
    if (next >= state.totalFrames) {
      get().pauseGame();
      return;
    }
    get().setCurrentFrame(next);
  },

  setPlaySpeed: (speed: number) => set({ playSpeed: speed }),

  setParams: (updates: Partial<SectionParams>, reason = '参数微调') => {
    const state = get();
    const oldParams = state.currentParams;
    const newParams: SectionParams = { ...oldParams, ...updates };

    if (paramsEqual(oldParams, newParams)) return;

    const currentPoints = state.frames[state.currentFrame]?.points || [];
    const result = computeSectionResult(currentPoints, newParams);
    const now = Date.now();
    const diff = paramDiff(oldParams, newParams);

    set({
      currentParams: newParams,
      paramHistory: [
        ...state.paramHistory,
        {
          params: { ...newParams },
          timestamp: now,
          operator: state.currentUser.name,
          reason,
          sectionResult: result,
        },
      ],
      lastSectionResult: result,
    });

    get().addAuditLog(
      'param_change',
      { params: oldParams, diff } as unknown as Record<string, unknown>,
      { params: newParams, diff } as unknown as Record<string, unknown>,
      reason
    );
  },

  setRole: (role: UserRole) => {
    const user = USERS.find((u) => u.role === role) || USERS[0];
    set({ currentRole: role, currentUser: user });
  },

  setSelectedPoint: (id: string | null) => set({ selectedPointId: id }),

  markOutlier: (pointId: string, reason = '疑似漂浮离群点') => {
    const state = get();
    const existing = state.outlierMarks.find((m) => m.pointId === pointId);
    if (existing) return;

    const currentPoints = state.frames[state.currentFrame]?.points || [];
    const point = currentPoints.find((p) => p.id === pointId);
    if (!point) return;

    const now = Date.now();
    const mark: OutlierMark = {
      id: genId('om_'),
      pointId,
      status: 'pending',
      markedBy: state.currentUser.name,
      markedAt: now,
      pointSnapshot: { ...point },
    };

    set({ outlierMarks: [...state.outlierMarks, mark] });
    get().addAuditLog(
      'outlier_mark',
      { pointId, previous: null } as unknown as Record<string, unknown>,
      { pointId, markId: mark.id, status: 'pending', point } as unknown as Record<string, unknown>,
      reason
    );
  },

  unmarkOutlier: (markId: string) => {
    const state = get();
    const mark = state.outlierMarks.find((m) => m.id === markId);
    if (!mark) return;
    set({ outlierMarks: state.outlierMarks.filter((m) => m.id !== markId) });
  },

  reviewOutlier: (markId: string, approved: boolean, reason: string) => {
    const state = get();
    const now = Date.now();
    const marks = state.outlierMarks.map((m) => {
      if (m.id !== markId) return m;
      return {
        ...m,
        status: approved ? ('approved' as const) : ('rejected' as const),
        reviewedBy: state.currentUser.name,
        reviewedAt: now,
        reviewReason: reason,
      };
    });

    set({ outlierMarks: marks });

    const mark = marks.find((m) => m.id === markId);
    get().addAuditLog(
      approved ? 'outlier_approve' : 'outlier_reject',
      { markId, previousStatus: 'pending' } as unknown as Record<string, unknown>,
      {
        markId,
        newStatus: approved ? 'approved' : 'rejected',
        reviewedBy: state.currentUser.name,
        pointSnapshot: mark?.pointSnapshot,
      } as unknown as Record<string, unknown>,
      reason
    );
  },

  addAuditLog: (
    action: AuditAction,
    beforeValue: Record<string, unknown>,
    afterValue: Record<string, unknown>,
    reason = '系统记录'
  ) => {
    const state = get();
    const log: AuditLog = {
      id: genId('log_'),
      action,
      operator: state.currentUser.name,
      role: state.currentUser.role,
      timestamp: Date.now(),
      reason,
      beforeValue,
      afterValue,
    };
    set({ auditLogs: [...state.auditLogs, log] });
  },
}));
