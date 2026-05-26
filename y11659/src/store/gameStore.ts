import { create } from 'zustand';
import type {
  GameState,
  GameSettings,
  Vehicle,
  OperationRecord,
  UserAction,
  ErrorType,
  GameStatus,
  QueueItem,
  GameRecord,
} from '../types';
import { mockVehicles } from '../data/mockData';

const defaultSettings: GameSettings = {
  gameMode: 'quick',
  totalTime: 180,
  vehicleCount: 8,
  timeoutThreshold: 30,
  difficulty: 'mixed',
};

const shuffleArray = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const selectVehiclesByDifficulty = (
  vehicles: Vehicle[],
  count: number,
  difficulty: string
): Vehicle[] => {
  let filtered = vehicles;
  if (difficulty !== 'mixed') {
    filtered = vehicles.filter(v => v.difficulty === difficulty);
  }
  const shuffled = shuffleArray(filtered);
  return shuffled.slice(0, Math.min(count, shuffled.length));
};

interface GameStore extends GameState {
  settings: GameSettings;
  playerName: string;
  setPlayerName: (name: string) => void;
  setSettings: (settings: Partial<GameSettings>) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  submitAction: (action: UserAction, reasons?: string[], inputContainerNumber?: string) => void;
  tick: () => void;
  getCurrentVehicle: () => Vehicle | null;
  getMaxScore: () => number;
  getGameRecord: () => GameRecord | null;
}

export const useGameStore = create<GameStore>((set, get) => ({
  status: 'idle',
  currentVehicleIndex: 0,
  vehicles: [],
  queue: [],
  score: 0,
  combo: 0,
  timeRemaining: defaultSettings.totalTime,
  operations: [],
  settings: defaultSettings,
  currentVehicleStartTime: 0,
  playerName: '',

  setPlayerName: (name) => set({ playerName: name }),

  setSettings: (settings) =>
    set((state) => ({
      settings: { ...state.settings, ...settings },
    })),

  startGame: () => {
    const settings = get().settings;
    const selectedVehicles = selectVehiclesByDifficulty(
      mockVehicles,
      settings.vehicleCount,
      settings.difficulty
    );
    const queue: QueueItem[] = selectedVehicles.slice(1).map((v) => ({
      vehicleId: v.id,
      waitTime: 0,
    }));

    set({
      status: 'playing',
      currentVehicleIndex: 0,
      vehicles: selectedVehicles,
      queue,
      score: 0,
      combo: 0,
      timeRemaining: settings.totalTime,
      operations: [],
      currentVehicleStartTime: Date.now(),
    });
  },

  pauseGame: () => set({ status: 'paused' }),

  resumeGame: () => {
    set((state) => ({
      status: 'playing',
      currentVehicleStartTime: Date.now(),
    }));
  },

  endGame: () => {
    set({ status: 'finished' });
  },

  resetGame: () =>
    set({
      status: 'idle',
      currentVehicleIndex: 0,
      vehicles: [],
      queue: [],
      score: 0,
      combo: 0,
      timeRemaining: defaultSettings.totalTime,
      operations: [],
      currentVehicleStartTime: 0,
    }),

  submitAction: (action, reasons = [], inputContainerNumber) => {
    const state = get();
    const vehicle = state.vehicles[state.currentVehicleIndex];
    if (!vehicle) return;

    const operationTime = (Date.now() - state.currentVehicleStartTime) / 1000;
    const containerData = vehicle.materials.container.data as { containerNumber: string };
    const bookingData = vehicle.materials.bookingNote.data as { containerNumber: string; plateNumber: string; valid: boolean; isDangerous: boolean };
    const plateData = vehicle.materials.licensePlate.data as { plateNumber: string };
    const hasDangerousMark = !!vehicle.materials.dangerousMark;

    let isCorrect = action === vehicle.correctAction;
    let scoreChange = 0;
    let errorType: ErrorType | undefined;

    const containerMatch = inputContainerNumber
      ? inputContainerNumber.toUpperCase() === containerData.containerNumber
      : true;

    if (action === 'release') {
      const bookingContainerMatch = containerData.containerNumber === bookingData.containerNumber;
      const bookingPlateMatch = plateData.plateNumber === bookingData.plateNumber;
      const bookingValid = bookingData.valid;
      const dangerousMatch = bookingData.isDangerous === hasDangerousMark;

      if (!bookingContainerMatch || !bookingPlateMatch) {
        isCorrect = false;
        errorType = 'booking_mismatch';
        scoreChange = -20;
      } else if (!bookingValid) {
        isCorrect = false;
        errorType = 'booking_mismatch';
        scoreChange = -20;
      } else if (!dangerousMatch && hasDangerousMark) {
        isCorrect = false;
        errorType = 'dangerous_missed';
        scoreChange = -30;
      } else if (!containerMatch) {
        isCorrect = false;
        errorType = 'container_number_wrong';
        scoreChange = -10;
      } else {
        scoreChange = 10;
        if (operationTime < 5) scoreChange += 3;
        if (state.combo >= 2) scoreChange += 5;
      }
    } else {
      if (vehicle.correctAction === 'release') {
        isCorrect = false;
        errorType = 'wrong_intercept';
        scoreChange = -10;
      } else {
        const userReasonMatch = reasons.some(r => vehicle.interceptReason?.includes(r));
        if (userReasonMatch || reasons.length > 0) {
          scoreChange = 15;
          if (operationTime < 5) scoreChange += 3;
          if (state.combo >= 2) scoreChange += 5;
        } else {
          scoreChange = 10;
        }
      }
    }

    const newCombo = isCorrect ? state.combo + 1 : 0;

    const operation: OperationRecord = {
      vehicleId: vehicle.id,
      userAction: action,
      userReasons: reasons,
      inputContainerNumber,
      isCorrect,
      scoreChange,
      errorType,
      operationTime,
      waitTime: 0,
      timestamp: Date.now(),
    };

    const newIndex = state.currentVehicleIndex + 1;
    const isFinished = newIndex >= state.vehicles.length;

    set((s) => ({
      score: s.score + scoreChange,
      combo: newCombo,
      operations: [...s.operations, operation],
      currentVehicleIndex: newIndex,
      currentVehicleStartTime: Date.now(),
      status: isFinished ? 'finished' as GameStatus : s.status,
    }));
  },

  tick: () => {
    const state = get();
    if (state.status !== 'playing') return;

    const newTime = state.timeRemaining - 1;
    if (newTime <= 0) {
      set({ timeRemaining: 0, status: 'finished' });
      return;
    }

    const newQueue = state.queue.map((item, idx) => {
      const effectiveWaitTime = item.waitTime + (idx === 0 ? 1 : 0.5);
      if (effectiveWaitTime >= state.settings.timeoutThreshold && item.waitTime < state.settings.timeoutThreshold) {
        set((s) => ({
          score: s.score - 5,
          operations: [
            ...s.operations,
            {
              vehicleId: item.vehicleId,
              userAction: 'release' as UserAction,
              isCorrect: false,
              scoreChange: -5,
              errorType: 'queue_timeout' as ErrorType,
              operationTime: 0,
              waitTime: effectiveWaitTime,
              timestamp: Date.now(),
            },
          ],
        }));
      }
      return { ...item, waitTime: effectiveWaitTime };
    });

    set({
      timeRemaining: newTime,
      queue: newQueue,
    });
  },

  getCurrentVehicle: () => {
    const state = get();
    return state.vehicles[state.currentVehicleIndex] || null;
  },

  getMaxScore: () => {
    const state = get();
    return state.vehicles.length * 18;
  },

  getGameRecord: () => {
    const state = get();
    if (state.status !== 'finished') return null;

    const errorTypes: Record<string, number> = {};
    state.operations.forEach((op) => {
      if (op.errorType) {
        errorTypes[op.errorType] = (errorTypes[op.errorType] || 0) + 1;
      }
    });

    const correctCount = state.operations.filter((op) => op.isCorrect).length;

    return {
      id: Math.random().toString(36).substring(2, 11),
      playerName: state.playerName,
      startTime: 0,
      endTime: Date.now(),
      totalScore: state.score,
      maxScore: state.getMaxScore(),
      correctCount,
      totalCount: state.vehicles.length,
      operations: state.operations,
      errorTypes,
    };
  },
}));
