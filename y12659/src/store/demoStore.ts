import { create } from 'zustand';
import type { DemoSession, DemoStatus, PlaySpeed, DetectionEvent, RiskLevel } from '@/types';
import {
  slopePoints,
  presetEvents,
  TOTAL_DURATION,
  PLANE_START,
  PLANE_END,
  PLANE_SPEED,
} from '@/data/mockData';
import {
  computeMinDistance,
  checkOutOfBounds,
  getRiskLevelByDistance,
} from '@/utils/collision';

interface DemoState extends DemoSession {
  distanceHistoryBuffer: { distance: number }[];
  lastOutOfBoundsFrame: number;
  initSession: () => void;
  setStatus: (status: DemoStatus) => void;
  setPlaySpeed: (speed: PlaySpeed) => void;
  tick: (deltaMs: number) => void;
  seekTo: (time: number) => void;
  restart: () => void;
  finish: () => void;
  getEventsAtOrBefore: (time: number) => DetectionEvent[];
}

function createInitialState(): DemoSession {
  const planePosition = PLANE_START;
  const { minDistance, closestPointId } = computeMinDistance(slopePoints, planePosition);

  return {
    id: `SESSION-${Date.now()}`,
    startTime: new Date(),
    status: 'idle',
    currentTime: 0,
    totalDuration: TOTAL_DURATION,
    playSpeed: 1,
    plane: {
      position: planePosition,
      normal: [1, 0, 0],
      thickness: 0.1,
      isOutOfBounds: false,
      minDistance,
      closestPointId,
    },
    events: presetEvents,
    outOfBoundsCount: 0,
    maxRiskLevel: 'safe',
    unusableRecords: presetEvents.filter((e) => !e.isRecordUsable),
    distanceHistory: [],
  };
}

export const useDemoStore = create<DemoState>((set, get) => ({
  ...createInitialState(),
  distanceHistoryBuffer: [],
  lastOutOfBoundsFrame: -100,

  initSession: () => {
    set({
      ...createInitialState(),
      distanceHistoryBuffer: [],
      lastOutOfBoundsFrame: -100,
    });
  },

  setStatus: (status) => set({ status }),
  setPlaySpeed: (playSpeed) => set({ playSpeed }),

  tick: (deltaMs) => {
    const state = get();
    if (state.status !== 'playing') return;

    const deltaSec = (deltaMs / 1000) * state.playSpeed;
    let newTime = state.currentTime + deltaSec;
    let finished = false;

    if (newTime >= state.totalDuration) {
      newTime = state.totalDuration;
      finished = true;
    }

    const planePosition = PLANE_START + PLANE_SPEED * newTime;
    const { minDistance, closestPointId } = computeMinDistance(slopePoints, planePosition);

    const newBuffer = [...state.distanceHistoryBuffer, { distance: minDistance }].slice(-30);
    const isOutOfBounds = checkOutOfBounds(newBuffer);

    let outOfBoundsCount = state.outOfBoundsCount;
    let maxRiskLevel: RiskLevel = state.maxRiskLevel;
    const currentRisk = getRiskLevelByDistance(minDistance);

    if (currentRisk === 'danger' && maxRiskLevel !== 'danger') maxRiskLevel = 'danger';
    else if (currentRisk === 'warning' && maxRiskLevel === 'safe') maxRiskLevel = 'warning';

    if (isOutOfBounds) {
      const frameIdx = Math.floor(newTime * 60);
      if (frameIdx - state.lastOutOfBoundsFrame > 60) {
        outOfBoundsCount += 1;
        set({ lastOutOfBoundsFrame: frameIdx });
      }
    }

    const newHistory = [...state.distanceHistory, { time: newTime, distance: minDistance }];

    set({
      currentTime: newTime,
      plane: {
        ...state.plane,
        position: planePosition,
        minDistance,
        closestPointId,
        isOutOfBounds,
      },
      distanceHistoryBuffer: newBuffer,
      distanceHistory: newHistory,
      outOfBoundsCount,
      maxRiskLevel,
      status: finished ? 'finished' : state.status,
    });
  },

  seekTo: (time) => {
    const clampedTime = Math.max(0, Math.min(time, TOTAL_DURATION));
    const planePosition = PLANE_START + PLANE_SPEED * clampedTime;
    const { minDistance, closestPointId } = computeMinDistance(slopePoints, planePosition);

    const history = [];
    const steps = Math.min(Math.ceil(clampedTime * 10), 600);
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * clampedTime;
      const pos = PLANE_START + PLANE_SPEED * t;
      const { minDistance: d } = computeMinDistance(slopePoints, pos);
      history.push({ time: t, distance: d });
    }

    const buffer = history.slice(-30).map((h) => ({ distance: h.distance }));
    const isOutOfBounds = checkOutOfBounds(buffer);

    set({
      currentTime: clampedTime,
      plane: {
        ...get().plane,
        position: planePosition,
        minDistance,
        closestPointId,
        isOutOfBounds,
      },
      distanceHistory: history,
      distanceHistoryBuffer: buffer,
    });
  },

  restart: () => {
    set({
      ...createInitialState(),
      distanceHistoryBuffer: [],
      lastOutOfBoundsFrame: -100,
      status: 'playing',
    });
  },

  finish: () => set({ status: 'finished', currentTime: TOTAL_DURATION }),

  getEventsAtOrBefore: (time) => {
    return get().events.filter((e) => e.timestamp <= time);
  },
}));
