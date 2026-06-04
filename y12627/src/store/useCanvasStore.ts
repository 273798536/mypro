import { create } from 'zustand';
import type { CanvasState, Tank, ActionRecord, ActionType, TankStatus } from '@/types';
import { SAMPLE_DATA_LIST, DEMO_ERROR_SCENARIO } from '@/constants/sampleData';
import { STATUS_COLOR_MAP } from '@/constants/colorRules';

const STORAGE_KEY = 'aquarium-layout-sessions';
const MAX_PREVIOUS_SESSIONS = 3;

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function getScaleValue(ratio: string): number {
  const parts = ratio.split(':');
  if (parts.length === 2) {
    return parseInt(parts[1], 10) || 100;
  }
  return 100;
}

function loadPreviousSessions(): CanvasState['previousSessions'] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load previous sessions:', e);
  }
  return [];
}

function saveCurrentSession(session: CanvasState['previousSessions'][0]): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let sessions: CanvasState['previousSessions'] = stored ? JSON.parse(stored) : [];
    sessions = [session, ...sessions].slice(0, MAX_PREVIOUS_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save session:', e);
  }
}

const initialSample = SAMPLE_DATA_LIST[0];
const sessionId = generateId();

export const useCanvasStore = create<CanvasState & {
  setScale: (scale: number) => void;
  setScaleRatio: (ratio: string, record?: boolean) => void;
  setOffset: (x: number, y: number) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setSelectedTankId: (id: string | null) => void;
  setIsPanning: (panning: boolean, startX?: number, startY?: number) => void;
  setDragTank: (id: string | null, offsetX?: number, offsetY?: number) => void;
  moveTank: (id: string, x: number, y: number) => void;
  updateTankStatus: (id: string, status: TankStatus) => void;
  addRecord: (type: ActionType, description: string, beforeValue: unknown, afterValue: unknown, options?: { isError?: boolean; relatedTankId?: string }) => void;
  loadSample: (sampleId: string) => void;
  resetCanvas: () => void;
  triggerErrorDemo: () => void;
  triggerRecoveryDemo: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  getTankColor: (tank: Tank) => string;
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
  snapToGrid: (value: number) => number;
  cleanupSession: () => void;
}>((set, get) => ({
  scale: 1,
  scaleRatio: initialSample.initialScaleRatio,
  offsetX: 0,
  offsetY: 0,
  gridSize: 20,
  snapEnabled: true,
  tanks: [...initialSample.tanks],
  records: [],
  selectedTankId: null,
  sessionId,
  sessionStartTime: Date.now(),
  isPanning: false,
  panStartX: 0,
  panStartY: 0,
  dragTankId: null,
  dragOffsetX: 0,
  dragOffsetY: 0,
  previousSessions: loadPreviousSessions(),

  setScale: (scale) => {
    const before = get().scale;
    set({ scale });
    get().addRecord('zoom', '画布缩放', before, scale);
  },

  setScaleRatio: (ratio, record = true) => {
    const before = get().scaleRatio;
    set({ scaleRatio: ratio });
    if (record) {
      get().addRecord('scale-change', `比例尺变更为 ${ratio}`, before, ratio);
    }
  },

  setOffset: (x, y) => {
    const state = get();
    const before = { x: state.offsetX, y: state.offsetY };
    set({ offsetX: x, offsetY: y });
    if (Math.abs(before.x - x) > 1 || Math.abs(before.y - y) > 1) {
      get().addRecord('pan', '画布平移', before, { x, y });
    }
  },

  setSnapEnabled: (enabled) => {
    const before = get().snapEnabled;
    set({ snapEnabled: enabled });
    get().addRecord('snap', `网格吸附${enabled ? '开启' : '关闭'}`, before, enabled);
  },

  setSelectedTankId: (id) => set({ selectedTankId: id }),

  setIsPanning: (panning, startX = 0, startY = 0) => {
    set({ isPanning: panning, panStartX: startX, panStartY: startY });
  },

  setDragTank: (id, offsetX = 0, offsetY = 0) => {
    set({ dragTankId: id, dragOffsetX: offsetX, dragOffsetY: offsetY });
  },

  moveTank: (id, x, y) => {
    const state = get();
    const tank = state.tanks.find(t => t.id === id);
    if (!tank) return;

    const snapX = state.snapEnabled ? state.snapToGrid(x) : x;
    const snapY = state.snapEnabled ? state.snapToGrid(y) : y;

    const before = { x: tank.x, y: tank.y };
    const after = { x: snapX, y: snapY };

    if (state.snapEnabled && (before.x !== snapX || before.y !== snapY)) {
      get().addRecord('snap', `吸附到网格 ${snapX},${snapY}`, before, after, { relatedTankId: id });
    }

    set({
      tanks: state.tanks.map(t =>
        t.id === id ? { ...t, x: snapX, y: snapY } : t
      )
    });

    if (before.x !== snapX || before.y !== snapY) {
      get().addRecord('tank-move', `移动 ${tank.name}`, before, after, { relatedTankId: id });
    }
  },

  updateTankStatus: (id, status) => {
    const state = get();
    const tank = state.tanks.find(t => t.id === id);
    if (!tank) return;

    const before = tank.status;
    set({
      tanks: state.tanks.map(t =>
        t.id === id ? { ...t, status } : t
      )
    });
    get().addRecord('recovery', `${tank.name} 状态更新为 ${status}`, before, status, { relatedTankId: id });
  },

  addRecord: (type, description, beforeValue, afterValue, options = {}) => {
    const record: ActionRecord = {
      id: generateId(),
      timestamp: Date.now(),
      type,
      description,
      beforeValue,
      afterValue,
      operator: '学生用户',
      ...options
    };
    set(state => ({
      records: [...state.records, record]
    }));
  },

  loadSample: (sampleId) => {
    const sample = SAMPLE_DATA_LIST.find(s => s.id === sampleId);
    if (!sample) return;

    const state = get();
    const before = { tanks: state.tanks, scaleRatio: state.scaleRatio };
    
    set({
      tanks: [...sample.tanks],
      scaleRatio: sample.initialScaleRatio,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      selectedTankId: null
    });

    get().addRecord('load-sample', `加载样例：${sample.name}`, before, {
      tanks: sample.tanks,
      scaleRatio: sample.initialScaleRatio
    });
  },

  resetCanvas: () => {
    const state = get();
    const before = {
      tanks: state.tanks,
      scale: state.scale,
      offsetX: state.offsetX,
      offsetY: state.offsetY,
      scaleRatio: state.scaleRatio
    };

    set({
      tanks: [...initialSample.tanks],
      scale: 1,
      scaleRatio: initialSample.initialScaleRatio,
      offsetX: 0,
      offsetY: 0,
      selectedTankId: null,
      isPanning: false,
      dragTankId: null
    });

    get().addRecord('reset', '重置画布', before, {
      tanks: initialSample.tanks,
      scale: 1,
      scaleRatio: initialSample.initialScaleRatio,
      offsetX: 0,
      offsetY: 0
    });
  },

  triggerErrorDemo: () => {
    const state = get();
    const before = state.scaleRatio;
    
    set({
      scaleRatio: DEMO_ERROR_SCENARIO.wrongScale,
      tanks: state.tanks.map(t => ({ ...t, status: 'error' as TankStatus }))
    });

    get().addRecord('scale-change', DEMO_ERROR_SCENARIO.errorDescription, before, DEMO_ERROR_SCENARIO.wrongScale, {
      isError: true
    });
  },

  triggerRecoveryDemo: () => {
    const state = get();
    const before = state.scaleRatio;
    
    set({
      scaleRatio: DEMO_ERROR_SCENARIO.correctScale,
      tanks: state.tanks.map(t => {
        const original = initialSample.tanks.find(ot => ot.id === t.id);
        return {
          ...t,
          status: t.missingUnit ? 'error' as TankStatus : (t.source === 'supplement' ? 'warning' as TankStatus : 'recovered' as TankStatus),
          unit: original?.unit || t.unit,
          remark: original?.remark || t.remark
        };
      })
    });

    get().addRecord('recovery', DEMO_ERROR_SCENARIO.recoveryDescription, before, DEMO_ERROR_SCENARIO.correctScale);
  },

  zoomIn: () => {
    const state = get();
    const newScale = Math.min(state.scale * 1.2, 3);
    if (newScale !== state.scale) {
      get().setScale(newScale);
    }
  },

  zoomOut: () => {
    const state = get();
    const newScale = Math.max(state.scale / 1.2, 0.3);
    if (newScale !== state.scale) {
      get().setScale(newScale);
    }
  },

  resetZoom: () => {
    get().setScale(1);
  },

  getTankColor: (tank) => {
    return STATUS_COLOR_MAP[tank.status];
  },

  screenToWorld: (screenX, screenY) => {
    const state = get();
    return {
      x: (screenX - state.offsetX) / state.scale,
      y: (screenY - state.offsetY) / state.scale
    };
  },

  snapToGrid: (value) => {
    const state = get();
    return Math.round(value / state.gridSize) * state.gridSize;
  },

  cleanupSession: () => {
    const state = get();
    saveCurrentSession({
      sessionId: state.sessionId,
      startTime: state.sessionStartTime,
      endTime: Date.now(),
      recordCount: state.records.length
    });
  }
}));
