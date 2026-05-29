import { create } from 'zustand';
import type { GameState, PlacementRecord, FailureReason, FeedbackMessage, CargoBox, Compartment } from '../data/types';
import { validateZoneMatch } from '../utils/zoneValidator';
import { validateDeliveryOrder } from '../utils/orderValidator';
import { calculateTemperature, checkTimeoutFailure } from '../utils/temperatureEngine';
import { getLevelById } from '../data/levels';

interface GameStore extends GameState {
  feedbackMessages: FeedbackMessage[];
  draggedCargoBox: CargoBox | null;
  setDraggedCargoBox: (box: CargoBox | null) => void;
  initGame: (levelId: string) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  placeCargoBox: (cargoBox: CargoBox, compartment: Compartment) => void;
  removeCargoBox: (cargoBoxId: string) => void;
  tickTimer: () => void;
  completeGame: () => void;
  addFeedback: (type: FeedbackMessage['type'], message: string) => void;
  removeFeedback: (id: string) => void;
  resetGame: () => void;
  getPlacedCargoInCompartment: (compartmentId: string) => string[];
  isCargoBoxPlaced: (cargoBoxId: string) => boolean;
}

const createInitialState = (levelId: string): Partial<GameState> => {
  const level = getLevelById(levelId);
  return {
    levelId,
    status: 'idle',
    placements: [],
    remainingTime: level?.timeLimitSeconds || 300,
    temperatureHistory: [{ time: Date.now(), temp: 4 }],
    failureReasons: [],
    operationHistory: [],
    currentTemperature: 4,
  };
};

export const useGameStore = create<GameStore>((set, get) => ({
  levelId: '',
  status: 'idle',
  placements: [],
  remainingTime: 300,
  temperatureHistory: [{ time: Date.now(), temp: 4 }],
  failureReasons: [],
  operationHistory: [],
  currentTemperature: 4,
  feedbackMessages: [],
  draggedCargoBox: null,

  setDraggedCargoBox: (box) => set({ draggedCargoBox: box }),

  initGame: (levelId) => {
    const level = getLevelById(levelId);
    if (!level) return;
    set({
      ...createInitialState(levelId),
      levelId,
      status: 'idle',
      feedbackMessages: [],
      draggedCargoBox: null,
    });
    get().addFeedback('info', `已加载关卡：${level.originalName}`);
  },

  startGame: () => {
    set({ status: 'playing' });
    get().addFeedback('info', '开始装车，请尽快完成！');
  },

  pauseGame: () => {
    set({ status: 'paused' });
    get().addFeedback('warning', '游戏已暂停');
  },

  resumeGame: () => {
    set({ status: 'playing' });
    get().addFeedback('info', '游戏继续');
  },

  placeCargoBox: (cargoBox, compartment) => {
    const state = get();
    if (state.status !== 'playing') return;

    const placedInCompartment = state.placements.filter(
      p => p.compartmentId === compartment.id
    );

    if (placedInCompartment.length >= compartment.capacity) {
      get().addFeedback('error', `"${compartment.originalName}"格位已满，无法放置更多货箱`);
      return;
    }

    if (state.isCargoBoxPlaced(cargoBox.id)) {
      get().removeCargoBox(cargoBox.id);
    }

    const validation = validateZoneMatch(cargoBox, compartment);

    const placement: PlacementRecord = {
      cargoBoxId: cargoBox.id,
      compartmentId: compartment.id,
      timestamp: Date.now(),
      isCorrectZone: validation.isValid,
    };

    const newFailureReasons = [...state.failureReasons];
    if (validation.failureReason) {
      newFailureReasons.push(validation.failureReason);
      get().addFeedback('error', validation.failureReason.description);
    } else {
      get().addFeedback('success', `"${cargoBox.originalName}"已正确放置到"${compartment.originalName}"`);
    }

    set({
      placements: [...state.placements, placement],
      failureReasons: newFailureReasons,
      operationHistory: [
        ...state.operationHistory,
        {
          action: validation.isValid ? '正确放置' : '错误放置',
          timestamp: Date.now(),
          details: `"${cargoBox.originalName}" → "${compartment.originalName}"${validation.isValid ? '' : '（温层不匹配）'}`,
        },
      ],
    });
  },

  removeCargoBox: (cargoBoxId) => {
    const state = get();
    const placement = state.placements.find(p => p.cargoBoxId === cargoBoxId);
    if (!placement) return;

    set({
      placements: state.placements.filter(p => p.cargoBoxId !== cargoBoxId),
      failureReasons: state.failureReasons.filter(
        f => !(f.type === 'zone_mismatch' && f.cargoBoxId === cargoBoxId)
      ),
      operationHistory: [
        ...state.operationHistory,
        {
          action: '移除货箱',
          timestamp: Date.now(),
          details: `从格位移出货箱ID: ${cargoBoxId}`,
        },
      ],
    });
  },

  tickTimer: () => {
    const state = get();
    if (state.status !== 'playing') return;

    const newRemainingTime = state.remainingTime - 1;
    const level = getLevelById(state.levelId);
    const newTemp = calculateTemperature(newRemainingTime, level?.timeLimitSeconds || 300);

    const chilledBoxes = level?.cargoBoxes.filter(c => c.temperatureZone === 'chilled') || [];
    const timeoutFailures = checkTimeoutFailure(newTemp, chilledBoxes);

    const hasNewTimeoutFailure = timeoutFailures.length > 0 &&
      !state.failureReasons.some(f => f.type === 'timeout');

    if (hasNewTimeoutFailure) {
      get().addFeedback('error', `温度超标！当前温度: ${newTemp.toFixed(1)}°C`);
    }

    set({
      remainingTime: newRemainingTime,
      currentTemperature: newTemp,
      temperatureHistory: [
        ...state.temperatureHistory,
        { time: Date.now(), temp: newTemp },
      ],
      failureReasons: hasNewTimeoutFailure
        ? [...state.failureReasons, ...timeoutFailures]
        : state.failureReasons,
    });

    if (newRemainingTime < -120) {
      get().completeGame();
    }
  },

  completeGame: () => {
    const state = get();
    const level = getLevelById(state.levelId);
    if (!level) return;

    const placementsWithDetails = state.placements.map(p => {
      const cargoBox = level.cargoBoxes.find(c => c.id === p.cargoBoxId)!;
      const compartment = level.compartments.find(c => c.id === p.compartmentId)!;
      return { cargoBox, compartment, placement: p };
    });

    const orderFailures = validateDeliveryOrder(placementsWithDetails, level.compartments);

    set({
      status: 'completed',
      failureReasons: [...state.failureReasons, ...orderFailures],
      operationHistory: [
        ...state.operationHistory,
        {
          action: '完成装车',
          timestamp: Date.now(),
          details: `共放置${state.placements.length}个货箱，发现${state.failureReasons.length + orderFailures.length}个问题`,
        },
      ],
    });
  },

  addFeedback: (type, message) => {
    const id = Date.now().toString() + Math.random();
    set(state => ({
      feedbackMessages: [
        ...state.feedbackMessages,
        { id, type, message, timestamp: Date.now() },
      ],
    }));

    setTimeout(() => {
      get().removeFeedback(id);
    }, 4000);
  },

  removeFeedback: (id) => {
    set(state => ({
      feedbackMessages: state.feedbackMessages.filter(f => f.id !== id),
    }));
  },

  resetGame: () => {
    const state = get();
    get().initGame(state.levelId);
  },

  getPlacedCargoInCompartment: (compartmentId) => {
    return get().placements
      .filter(p => p.compartmentId === compartmentId)
      .map(p => p.cargoBoxId);
  },

  isCargoBoxPlaced: (cargoBoxId) => {
    return get().placements.some(p => p.cargoBoxId === cargoBoxId);
  },
}));
