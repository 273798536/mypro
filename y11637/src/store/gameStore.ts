import { create } from 'zustand';
import type {
  Level,
  GameSession,
  GameAction,
  GameError,
  GameStatus,
  CargoBox,
  Compartment,
  ToastMessage,
} from '../types';
import { generateId, validateZonePlacement, calculateScore } from '../utils/game';
import { saveSession, saveRecord, clearCurrentSession } from '../utils/storage';

interface GameStore {
  currentLevel: Level | null;
  currentSession: GameSession | null;
  compartments: Compartment[];
  remainingTime: number;
  toasts: ToastMessage[];
  draggedCargo: CargoBox | null;
  setCurrentLevel: (level: Level | null) => void;
  startGame: (level: Level) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetGame: () => void;
  placeCargo: (cargo: CargoBox, compartmentId: string) => boolean;
  removeCargo: (compartmentId: string) => void;
  undoLastAction: () => void;
  submitGame: () => void;
  setRemainingTime: (time: number) => void;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  setDraggedCargo: (cargo: CargoBox | null) => void;
  clearSession: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  currentLevel: null,
  currentSession: null,
  compartments: [],
  remainingTime: 0,
  toasts: [],
  draggedCargo: null,

  setCurrentLevel: (level) => set({ currentLevel: level }),

  startGame: (level) => {
    const session: GameSession = {
      id: generateId(),
      levelId: level.id,
      startTime: Date.now(),
      endTime: null,
      pauseDuration: 0,
      lastPauseTime: null,
      actions: [{ type: 'start', timestamp: Date.now() }],
      score: null,
      errors: [],
      status: 'playing',
      placedCargos: new Map(),
    };

    const initialCompartments = level.compartments.map((c) => ({ ...c, occupiedBy: null }));

    set({
      currentLevel: level,
      currentSession: session,
      compartments: initialCompartments,
      remainingTime: level.timeLimit,
    });

    saveSession(session);
  },

  pauseGame: () => {
    const { currentSession } = get();
    if (!currentSession || currentSession.status !== 'playing') return;

    const action: GameAction = { type: 'pause', timestamp: Date.now() };
    const updatedSession: GameSession = {
      ...currentSession,
      status: 'paused',
      lastPauseTime: Date.now(),
      actions: [...currentSession.actions, action],
    };

    set({ currentSession: updatedSession });
    saveSession(updatedSession);
  },

  resumeGame: () => {
    const { currentSession } = get();
    if (!currentSession || currentSession.status !== 'paused') return;

    const now = Date.now();
    const pauseDuration = currentSession.lastPauseTime
      ? now - currentSession.lastPauseTime
      : 0;

    const action: GameAction = { type: 'resume', timestamp: now };
    const updatedSession: GameSession = {
      ...currentSession,
      status: 'playing',
      pauseDuration: currentSession.pauseDuration + pauseDuration,
      lastPauseTime: null,
      actions: [...currentSession.actions, action],
    };

    set({ currentSession: updatedSession });
    saveSession(updatedSession);
  },

  resetGame: () => {
    const { currentLevel } = get();
    if (!currentLevel) {
      get().startGame(currentLevel);
    }
  },

  placeCargo: (cargo, compartmentId) => {
    const { currentSession, compartments, currentLevel } = get();
    if (!currentSession || !currentLevel || currentSession.status !== 'playing') return false;

    const compartment = compartments.find((c) => c.id === compartmentId);
    if (!compartment || compartment.occupiedBy) return false;

    const validation = validateZonePlacement(cargo, compartment);

    const action: GameAction = {
      type: 'place',
      timestamp: Date.now(),
      cargoId: cargo.id,
      compartmentId: compartment.id,
      fromZone: undefined,
      toZone: compartment.zone,
    };

    const newErrors = currentSession.errors;
    if (!validation.valid && validation.error) {
      newErrors.push(validation.error);
    }

    const newPlacedCargos = new Map(currentSession.placedCargos);
    newPlacedCargos.set(compartmentId, cargo.id);

    const updatedCompartments = compartments.map((c) =>
      c.id === compartmentId ? { ...c, occupiedBy: cargo.id } : c
    );

    const updatedSession: GameSession = {
      ...currentSession,
      actions: [...currentSession.actions, action],
      errors: newErrors,
      placedCargos: newPlacedCargos,
    };

    set({
      currentSession: updatedSession,
      compartments: updatedCompartments,
    });

    saveSession(updatedSession);

    if (!validation.valid) {
      get().addToast({
        type: 'error',
        message: validation.error?.message || '放置失败',
        duration: 3000,
      });
      return false;
    }

    return true;
  },

  removeCargo: (compartmentId) => {
    const { currentSession, compartments, currentLevel } = get();
    if (!currentSession || !currentLevel || currentSession.status !== 'playing') return;

    const compartment = compartments.find((c) => c.id === compartmentId);
    if (!compartment || !compartment.occupiedBy) return;

    const action: GameAction = {
      type: 'remove',
      timestamp: Date.now(),
      cargoId: compartment.occupiedBy,
      compartmentId: compartment.id,
      fromZone: compartment.zone,
    };

    const newPlacedCargos = new Map(currentSession.placedCargos);
    newPlacedCargos.delete(compartmentId);

    const updatedCompartments = compartments.map((c) =>
      c.id === compartmentId ? { ...c, occupiedBy: null } : c
    );

    const updatedSession: GameSession = {
      ...currentSession,
      actions: [...currentSession.actions, action],
      placedCargos: newPlacedCargos,
    };

    set({
      currentSession: updatedSession,
      compartments: updatedCompartments,
    });

    saveSession(updatedSession);
  },

  undoLastAction: () => {
    const { currentSession, compartments, currentLevel } = get();
    if (!currentSession || !currentLevel) return;

    const lastPlaceActionIndex = [...currentSession.actions].reverse().findIndex(
      (a) => a.type === 'place'
    );

    if (lastPlaceActionIndex === -1) return;

    const actualIndex = currentSession.actions.length - 1 - lastPlaceActionIndex;
    const lastAction = currentSession.actions[actualIndex];

    if (!lastAction || !lastAction.compartmentId) return;

    const action: GameAction = {
      type: 'undo',
      timestamp: Date.now(),
      cargoId: lastAction.cargoId,
      compartmentId: lastAction.compartmentId,
    };

    const newPlacedCargos = new Map(currentSession.placedCargos);
    newPlacedCargos.delete(lastAction.compartmentId);

    const updatedCompartments = compartments.map((c) =>
      c.id === lastAction.compartmentId ? { ...c, occupiedBy: null } : c
    );

    const newActions = currentSession.actions.slice(0, actualIndex);

    const updatedSession: GameSession = {
      ...currentSession,
      actions: [...newActions, action],
      placedCargos: newPlacedCargos,
    };

    set({
      currentSession: updatedSession,
      compartments: updatedCompartments,
    });

    saveSession(updatedSession);
  },

  submitGame: () => {
    const { currentSession, currentLevel, compartments, remainingTime } = get();
    if (!currentSession || !currentLevel) return;

    const usedTime = currentLevel.timeLimit - remainingTime;
    const score = calculateScore(
      currentLevel,
      currentSession.placedCargos,
      compartments,
      currentSession.errors,
      usedTime
    );

    const action: GameAction = {
      type: 'submit',
      timestamp: Date.now(),
    };

    const updatedSession: GameSession = {
      ...currentSession,
      status: 'completed',
      endTime: Date.now(),
      actions: [...currentSession.actions, action],
      score,
    };

    set({ currentSession: updatedSession });

    saveSession(updatedSession);

    saveRecord({
      levelId: currentLevel.id,
      bestScore: Math.max(score.total, 0),
      bestTime: usedTime,
      completedAt: Date.now(),
      attempts: 1,
    });
  },

  setRemainingTime: (time) => set({ remainingTime: time }),

  addToast: (toast) => {
    const id = generateId();
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    if (toast.duration) {
      setTimeout(() => {
        get().removeToast(id);
      }, toast.duration);
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  setDraggedCargo: (cargo) => set({ draggedCargo: cargo }),

  clearSession: () => {
    clearCurrentSession();
    set({
      currentLevel: null,
      currentSession: null,
      compartments: [],
      remainingTime: 0,
    });
  },
}));
