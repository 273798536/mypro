import { create } from 'zustand';
import type {
  GameState,
  LevelData,
  OperationLog,
  Position,
  GameStateSnapshot,
  ReplayData,
} from '../types';
import { checkAllConflicts } from '../utils/conflictDetector';
import { calculateFuelConsumption, calculateDistance } from '../utils/fuelCalculator';
import { levels } from '../data/levels';

const generateId = (): string => Math.random().toString(36).substring(2, 11);
const SNAPSHOT_INTERVAL = 5000;

interface GameStore extends GameState {
  isReplayMode: boolean;
  replayData: ReplayData | null;
  replayIndex: number;
  snapshots: GameStateSnapshot[];
  lastSnapshotTime: number;
  pendingReviewLogs: string[];
  initGame: (level: LevelData) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetGame: () => void;
  setSpeed: (speed: 1 | 2 | 4) => void;
  tick: (deltaTime: number) => void;
  selectTug: (tugId: string | undefined) => void;
  selectShip: (shipId: string | undefined) => void;
  setDragging: (isDragging: boolean) => void;
  moveTug: (tugId: string, targetPosition: Position) => void;
  assignTugToTask: (tugId: string, taskId: string) => void;
  removeTugFromTask: (tugId: string, taskId: string) => void;
  startTask: (taskId: string) => void;
  completeTask: (taskId: string) => void;
  failTask: (taskId: string, reason: string) => void;
  resolveConflict: (conflictId: string) => void;
  addLog: (log: Omit<OperationLog, 'id' | 'timestamp'>) => void;
  correctLog: (logId: string, newAction: string) => void;
  markLogForReview: (logId: string) => void;
  confirmReviewedLog: (logId: string) => void;
  endGame: () => void;
  getCurrentLevel: () => LevelData | undefined;
  takeSnapshot: () => void;
  saveReplayData: () => ReplayData;
  loadReplayData: (data: ReplayData) => void;
  setReplayIndex: (index: number) => void;
  stepReplay: (direction: 'forward' | 'backward') => void;
  exitReplayMode: () => void;
  getReplayList: () => ReplayData[];
}

const REPLAY_STORAGE_KEY = 'port-tug-replays';

const initialState: GameState & {
  isReplayMode: boolean;
  replayData: ReplayData | null;
  replayIndex: number;
  snapshots: GameStateSnapshot[];
  lastSnapshotTime: number;
  pendingReviewLogs: string[];
} = {
  id: '',
  level: 1,
  status: 'ready',
  speed: 1,
  currentTime: 0,
  startTime: 0,
  endTime: 0,
  tugs: [],
  ships: [],
  berths: [],
  tideWindows: [],
  tasks: [],
  logs: [],
  activeConflicts: [],
  selectedTugId: undefined,
  selectedShipId: undefined,
  isDragging: false,
  isReplayMode: false,
  replayData: null,
  replayIndex: 0,
  snapshots: [],
  lastSnapshotTime: 0,
  pendingReviewLogs: [],
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  initGame: (level: LevelData) => {
    set({
      id: generateId(),
      level: level.id,
      status: 'ready',
      speed: 1,
      currentTime: level.startTime,
      startTime: level.startTime,
      endTime: level.endTime,
      tugs: level.tugs.map((t) => ({ ...t })),
      ships: level.ships.map((s) => ({ ...s })),
      berths: level.berths.map((b) => ({ ...b })),
      tideWindows: level.tideWindows.map((t) => ({ ...t })),
      tasks: level.tasks.map((t) => ({ ...t, conflicts: [] })),
      logs: [],
      activeConflicts: [],
      selectedTugId: undefined,
      selectedShipId: undefined,
      isDragging: false,
    });

    get().addLog({
      gameTime: level.startTime,
      type: 'system',
      action: `游戏初始化 - ${level.name}`,
      isCorrection: false,
      source: 'system',
    });
  },

  startGame: () => {
    set({ status: 'playing' });
    get().addLog({
      gameTime: get().currentTime,
      type: 'system',
      action: '游戏开始',
      isCorrection: false,
      source: 'system',
    });
  },

  pauseGame: () => {
    set({ status: 'paused' });
    get().addLog({
      gameTime: get().currentTime,
      type: 'system',
      action: '游戏暂停',
      isCorrection: false,
      source: 'system',
    });
  },

  resumeGame: () => {
    set({ status: 'playing' });
    get().addLog({
      gameTime: get().currentTime,
      type: 'system',
      action: '游戏继续',
      isCorrection: false,
      source: 'system',
    });
  },

  resetGame: () => {
    set(initialState);
  },

  setSpeed: (speed) => {
    set({ speed });
    get().addLog({
      gameTime: get().currentTime,
      type: 'system',
      action: `游戏速度调整为 ${speed}x`,
      isCorrection: false,
      source: 'system',
    });
  },

  tick: (deltaTime) => {
    const state = get();
    if (state.status !== 'playing') return;

    const newTime = state.currentTime + deltaTime * state.speed * 1000;

    if (newTime - state.lastSnapshotTime >= SNAPSHOT_INTERVAL || state.snapshots.length === 0) {
      get().takeSnapshot();
    }

    const updatedTugs = state.tugs.map((tug) => {
      if (tug.status === 'moving' && tug.targetPosition) {
        const distance = calculateDistance(tug.position, tug.targetPosition);
        const moveSpeed = 0.5 * state.speed;

        if (distance <= moveSpeed) {
          return {
            ...tug,
            position: { ...tug.targetPosition },
            targetPosition: undefined,
            status: 'idle' as const,
          };
        }

        const dx = (tug.targetPosition.x - tug.position.x) / distance;
        const dy = (tug.targetPosition.y - tug.position.y) / distance;
        const fuelConsumed = calculateFuelConsumption(tug, moveSpeed, 'moving');

        return {
          ...tug,
          position: {
            x: tug.position.x + dx * moveSpeed,
            y: tug.position.y + dy * moveSpeed,
          },
          currentFuel: Math.max(0, tug.currentFuel - fuelConsumed),
        };
      }

      if (tug.status === 'working') {
        const fuelConsumed = (tug.fuelConsumption * deltaTime * state.speed) / 3600;
        return {
          ...tug,
          currentFuel: Math.max(0, tug.currentFuel - fuelConsumed),
        };
      }

      return tug;
    });

    const updatedTasks = state.tasks.map((task) => {
      if (task.status === 'in_progress' && task.startTime) {
        const elapsed = newTime - task.startTime;
        if (elapsed >= task.estimatedDuration) {
          return { ...task, status: 'completed' as const, endTime: newTime };
        }
      }
      return task;
    });

    const updatedShips = state.ships.map((ship) => {
      const completedTask = updatedTasks.find(
        (t) => t.shipId === ship.id && t.status === 'completed' && t.type === 'dock'
      );
      if (completedTask && ship.status === 'docking') {
        return { ...ship, status: 'docked' as const };
      }
      return ship;
    });

    const updatedBerths = state.berths.map((berth) => {
      const completedDockTask = updatedTasks.find(
        (t) =>
          t.berthId === berth.id && t.status === 'completed' && t.type === 'dock'
      );
      if (completedDockTask) {
        const ship = state.ships.find((s) => s.id === completedDockTask.shipId);
        return {
          ...berth,
          status: 'occupied' as const,
          occupiedBy: ship?.name,
          availableFrom: newTime + 1800000,
        };
      }
      return berth;
    });

    const conflicts = checkAllConflicts(
      updatedTugs,
      updatedShips,
      updatedBerths,
      state.tideWindows,
      updatedTasks,
      newTime
    );

    const newConflicts = conflicts.filter(
      (c) => !state.activeConflicts.some((ac) => ac.type === c.type && ac.description === c.description)
    );

    newConflicts.forEach((conflict) => {
      get().addLog({
        gameTime: newTime,
        type: 'conflict',
        action: conflict.description,
        targetId: conflict.taskId,
        isCorrection: false,
        source: 'system',
      });
    });

    const allCompleted = updatedTasks.every((t) => t.status === 'completed' || t.status === 'failed');
    const timeUp = newTime >= state.endTime;

    set({
      currentTime: newTime,
      tugs: updatedTugs,
      ships: updatedShips,
      berths: updatedBerths,
      tasks: updatedTasks,
      activeConflicts: conflicts,
    });

    if (allCompleted || timeUp) {
      get().endGame();
    }
  },

  selectTug: (tugId) => {
    set({ selectedTugId: tugId });
  },

  selectShip: (shipId) => {
    set({ selectedShipId: shipId });
  },

  setDragging: (isDragging) => {
    set({ isDragging });
  },

  moveTug: (tugId, targetPosition) => {
    const state = get();
    const tug = state.tugs.find((t) => t.id === tugId);
    if (!tug || tug.status === 'working') return;

    set({
      tugs: state.tugs.map((t) =>
        t.id === tugId
          ? { ...t, targetPosition, status: 'moving' as const }
          : t
      ),
    });

    get().addLog({
      gameTime: state.currentTime,
      type: 'movement',
      action: `${tug.name} 移动到 (${Math.round(targetPosition.x)}, ${Math.round(targetPosition.y)})`,
      targetId: tugId,
      isCorrection: false,
      source: 'player',
    });
  },

  assignTugToTask: (tugId, taskId) => {
    const state = get();
    const tug = state.tugs.find((t) => t.id === tugId);
    const task = state.tasks.find((t) => t.id === taskId);

    if (!tug || !task) return;
    if (task.tugIds.includes(tugId)) return;

    set({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, tugIds: [...t.tugIds, tugId] } : t
      ),
    });

    get().addLog({
      gameTime: state.currentTime,
      type: 'assignment',
      action: `分配 ${tug.name} 到任务`,
      targetId: taskId,
      previousState: { tugIds: task.tugIds },
      newState: { tugIds: [...task.tugIds, tugId] },
      isCorrection: false,
      source: 'player',
    });
  },

  removeTugFromTask: (tugId, taskId) => {
    const state = get();
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task || task.status === 'in_progress') return;

    set({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, tugIds: t.tugIds.filter((id) => id !== tugId) }
          : t
      ),
    });
  },

  startTask: (taskId) => {
    const state = get();
    const task = state.tasks.find((t) => t.id === taskId);
    const ship = state.ships.find((s) => s.id === task?.shipId);
    const berth = state.berths.find((b) => b.id === task?.berthId);

    if (!task || !ship || !berth) return;
    if (task.tugIds.length < ship.requiredTugs) {
      get().addLog({
        gameTime: state.currentTime,
        type: 'conflict',
        action: `拖轮数量不足，需要 ${ship.requiredTugs} 艘，当前 ${task.tugIds.length} 艘`,
        targetId: taskId,
        isCorrection: false,
        source: 'system',
      });
      return;
    }

    set({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, status: 'in_progress' as const, startTime: state.currentTime }
          : t
      ),
      tugs: state.tugs.map((t) =>
        task.tugIds.includes(t.id)
          ? { ...t, status: 'working' as const, currentTaskId: taskId }
          : t
      ),
      ships: state.ships.map((s) =>
        s.id === ship.id ? { ...s, status: 'docking' as const } : s
      ),
    });

    get().addLog({
      gameTime: state.currentTime,
      type: 'assignment',
      action: `开始任务: ${ship.name} 靠泊 ${berth.name}`,
      targetId: taskId,
      isCorrection: false,
      source: 'player',
    });
  },

  completeTask: (taskId) => {
    const state = get();
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    set({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, status: 'completed' as const, endTime: state.currentTime }
          : t
      ),
      tugs: state.tugs.map((t) =>
        t.currentTaskId === taskId
          ? { ...t, status: 'idle' as const, currentTaskId: undefined }
          : t
      ),
    });

    get().addLog({
      gameTime: state.currentTime,
      type: 'completion',
      action: `任务完成`,
      targetId: taskId,
      isCorrection: false,
      source: 'system',
    });
  },

  failTask: (taskId, reason) => {
    const state = get();
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    set({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status: 'failed' as const } : t
      ),
      tugs: state.tugs.map((t) =>
        t.currentTaskId === taskId
          ? { ...t, status: 'idle' as const, currentTaskId: undefined }
          : t
      ),
    });

    get().addLog({
      gameTime: state.currentTime,
      type: 'conflict',
      action: `任务失败: ${reason}`,
      targetId: taskId,
      isCorrection: false,
      source: 'system',
    });
  },

  resolveConflict: (conflictId) => {
    const state = get();
    set({
      activeConflicts: state.activeConflicts.map((c) =>
        c.id === conflictId ? { ...c, resolved: true } : c
      ),
    });
  },

  addLog: (log) => {
    const newLog: OperationLog = {
      ...log,
      id: generateId(),
      timestamp: Date.now(),
    };
    set((state) => ({
      logs: [...state.logs, newLog],
    }));
  },

  correctLog: (logId, newAction) => {
    const state = get();
    const originalLog = state.logs.find((l) => l.id === logId);
    if (!originalLog) return;

    const correctionLog: OperationLog = {
      id: generateId(),
      timestamp: Date.now(),
      gameTime: state.currentTime,
      type: 'correction',
      action: newAction,
      targetId: originalLog.targetId,
      isCorrection: true,
      correctedLogId: logId,
      source: 'player',
    };

    set((state) => ({
      logs: [...state.logs, correctionLog],
    }));
  },

  markLogForReview: (logId) => {
    const state = get();
    if (!state.pendingReviewLogs.includes(logId)) {
      set((state) => ({
        pendingReviewLogs: [...state.pendingReviewLogs, logId],
      }));
      get().addLog({
        gameTime: state.currentTime,
        type: 'system',
        action: `日志 ${logId} 标记为待人工确认`,
        targetId: logId,
        isCorrection: false,
        source: 'player',
      });
    }
  },

  confirmReviewedLog: (logId) => {
    const state = get();
    set((state) => ({
      pendingReviewLogs: state.pendingReviewLogs.filter((id) => id !== logId),
    }));
    get().addLog({
      gameTime: state.currentTime,
      type: 'system',
      action: `日志 ${logId} 已人工确认`,
      targetId: logId,
      isCorrection: false,
      source: 'player',
    });
  },

  endGame: () => {
    const state = get();
    set({ status: 'finished' });
    get().addLog({
      gameTime: state.currentTime,
      type: 'system',
      action: '游戏结束',
      isCorrection: false,
      source: 'system',
    });
    get().saveReplayData();
  },

  getCurrentLevel: () => {
    const state = get();
    return levels.find((l) => l.id === state.level);
  },

  takeSnapshot: () => {
    const state = get();
    const snapshot: GameStateSnapshot = {
      time: state.currentTime,
      tugs: JSON.parse(JSON.stringify(state.tugs)),
      ships: JSON.parse(JSON.stringify(state.ships)),
      berths: JSON.parse(JSON.stringify(state.berths)),
      tasks: JSON.parse(JSON.stringify(state.tasks)),
      activeConflicts: JSON.parse(JSON.stringify(state.activeConflicts)),
    };
    set((state) => ({
      snapshots: [...state.snapshots, snapshot],
      lastSnapshotTime: state.currentTime,
    }));
  },

  saveReplayData: (): ReplayData => {
    const state = get();
    const level = levels.find((l) => l.id === state.level);
    const replayData: ReplayData = {
      gameId: state.id,
      level: state.level,
      levelName: level?.name || '未知关卡',
      startTime: state.startTime,
      endTime: state.currentTime,
      snapshots: state.snapshots,
      logs: state.logs,
      finalScore: 0,
      completedAt: Date.now(),
      playDuration: state.currentTime - state.startTime,
    };

    try {
      const existing = localStorage.getItem(REPLAY_STORAGE_KEY);
      const replayList: ReplayData[] = existing ? JSON.parse(existing) : [];
      replayList.unshift(replayData);
      const trimmedList = replayList.slice(0, 20);
      localStorage.setItem(REPLAY_STORAGE_KEY, JSON.stringify(trimmedList));
    } catch (e) {
      console.warn('Failed to save replay data:', e);
    }

    return replayData;
  },

  loadReplayData: (data: ReplayData) => {
    if (data.snapshots.length === 0) return;

    const firstSnapshot = data.snapshots[0];
    set({
      isReplayMode: true,
      replayData: data,
      replayIndex: 0,
      id: data.gameId,
      level: data.level,
      status: 'paused',
      currentTime: firstSnapshot.time,
      startTime: data.startTime,
      endTime: data.endTime,
      tugs: firstSnapshot.tugs,
      ships: firstSnapshot.ships,
      berths: firstSnapshot.berths,
      tasks: firstSnapshot.tasks,
      logs: data.logs,
      activeConflicts: firstSnapshot.activeConflicts,
    });
  },

  setReplayIndex: (index: number) => {
    const state = get();
    if (!state.replayData || !state.isReplayMode) return;

    const safeIndex = Math.max(0, Math.min(index, state.replayData.snapshots.length - 1));
    const snapshot = state.replayData.snapshots[safeIndex];

    set({
      replayIndex: safeIndex,
      currentTime: snapshot.time,
      tugs: snapshot.tugs,
      ships: snapshot.ships,
      berths: snapshot.berths,
      tasks: snapshot.tasks,
      activeConflicts: snapshot.activeConflicts,
    });
  },

  stepReplay: (direction: 'forward' | 'backward') => {
    const state = get();
    if (!state.replayData) return;

    const newIndex = direction === 'forward'
      ? state.replayIndex + 1
      : state.replayIndex - 1;

    state.setReplayIndex(newIndex);
  },

  exitReplayMode: () => {
    set({
      isReplayMode: false,
      replayData: null,
      replayIndex: 0,
      ...initialState,
    });
  },

  getReplayList: (): ReplayData[] => {
    try {
      const existing = localStorage.getItem(REPLAY_STORAGE_KEY);
      return existing ? JSON.parse(existing) : [];
    } catch (e) {
      console.warn('Failed to load replay list:', e);
      return [];
    }
  },
}));
