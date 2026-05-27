import { create } from 'zustand';
import { GameState, Order, ForwardContract, RoundRecord } from '@/types/game';
import { GAME_CONFIG } from '@/constants/config';
import { generateId, generateOrders } from '@/utils/order';
import { generateExchangeRate, calculateForwardRate } from '@/utils/exchange';
import { createForwardContract } from '@/utils/contract';
import { settleRound, createRoundRecord } from '@/utils/settlement';
import {
  saveCurrentGame,
  loadCurrentGame,
  clearCurrentGame,
  saveGameToHistory,
  calculateFinalScore,
} from '@/utils/storage';

interface GameStore extends GameState {
  pendingOrders: Order[];
  showSettlement: boolean;
  lastSettlement: RoundRecord | null;
  startNewGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  acceptOrder: (orderId: string) => void;
  rejectOrder: (orderId: string) => void;
  createHedge: (orderId: string, amount: number) => void;
  endRound: () => void;
  closeSettlement: () => void;
  saveToHistory: () => void;
  loadSavedGame: () => boolean;
  exportReport: () => string;
}

const getInitialState = (): GameState => {
  const now = Date.now();
  return {
    id: generateId(),
    round: 0,
    maxRounds: GAME_CONFIG.MAX_ROUNDS,
    status: 'idle',
    cash: GAME_CONFIG.INITIAL_CASH,
    inventory: GAME_CONFIG.INITIAL_INVENTORY,
    exchangeRate: GAME_CONFIG.BASE_EXCHANGE_RATE,
    forwardRate: GAME_CONFIG.BASE_EXCHANGE_RATE,
    history: [],
    pendingOrders: [],
    activeOrders: [],
    activeContracts: [],
    createdAt: now,
    updatedAt: now,
  };
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...getInitialState(),
  showSettlement: false,
  lastSettlement: null,

  startNewGame: () => {
    const initial = getInitialState();
    const firstRoundOrders = generateOrders(1, initial.maxRounds);
    const forwardRate = calculateForwardRate(initial.exchangeRate, 1);
    set({
      ...initial,
      round: 1,
      status: 'playing',
      pendingOrders: firstRoundOrders,
      forwardRate,
      updatedAt: Date.now(),
    });
    saveCurrentGame(get());
  },

  pauseGame: () => {
    set(state => ({ status: 'paused' }));
    saveCurrentGame(get());
  },

  resumeGame: () => {
    set(state => ({ status: 'playing' }));
    saveCurrentGame(get());
  },

  restartGame: () => {
    clearCurrentGame();
    const initial = getInitialState();
    const firstRoundOrders = generateOrders(1, initial.maxRounds);
    const forwardRate = calculateForwardRate(initial.exchangeRate, 1);
    set({
      ...initial,
      round: 1,
      status: 'playing',
      pendingOrders: firstRoundOrders,
      forwardRate,
      showSettlement: false,
      lastSettlement: null,
      updatedAt: Date.now(),
    });
    saveCurrentGame(get());
  },

  acceptOrder: (orderId: string) => {
    set(state => {
      const order = state.pendingOrders.find(o => o.id === orderId);
      if (!order) return state;

      if (order.amount > state.inventory) {
        return state;
      }

      const updatedOrder = { ...order, status: 'accepted' as const };
      return {
        pendingOrders: state.pendingOrders.filter(o => o.id !== orderId),
        activeOrders: [...state.activeOrders, updatedOrder],
        inventory: state.inventory - order.amount,
      };
    });
    saveCurrentGame(get());
  },

  rejectOrder: (orderId: string) => {
    set(state => ({
      pendingOrders: state.pendingOrders.filter(o => o.id !== orderId),
    }));
    saveCurrentGame(get());
  },

  createHedge: (orderId: string, amount: number) => {
    const state = get();
    const order = state.activeOrders.find(o => o.id === orderId);
    if (!order) return;

    const { contract, fee } = createForwardContract(
      order,
      state.exchangeRate,
      amount,
      state.round
    );

    if (fee > state.cash) {
      return;
    }

    set(s => ({
      activeContracts: [...s.activeContracts, contract],
      cash: s.cash - fee,
    }));
    saveCurrentGame(get());
  },

  endRound: () => {
    const state = get();
    if (state.status !== 'playing') return;

    const result = settleRound(
      state.round,
      state.activeOrders,
      state.activeContracts,
      state.cash,
      state.inventory,
      state.exchangeRate
    );

    const endingCash = state.cash + result.netProfit;
    const endingInventory = state.inventory;

    const roundRecord = createRoundRecord(
      state.round,
      state.exchangeRate,
      state.forwardRate,
      state.activeOrders,
      state.activeContracts,
      result.cashFlow,
      result.events,
      result.netProfit,
      endingCash,
      endingInventory
    );

    const newHistory = [...state.history, roundRecord];

    if (result.isBankrupt) {
      const finalState = {
        ...state,
        cash: endingCash,
        activeOrders: result.updatedOrders,
        activeContracts: result.updatedContracts,
        history: newHistory,
        status: 'bankrupt' as const,
        endReason: result.bankruptReason,
        showSettlement: true,
        lastSettlement: roundRecord,
        updatedAt: Date.now(),
      };
      set(finalState);
      saveCurrentGame(finalState);
      return;
    }

    const nextRound = state.round + 1;

    if (nextRound > state.maxRounds) {
      const finalState = {
        ...state,
        cash: endingCash,
        activeOrders: result.updatedOrders,
        activeContracts: result.updatedContracts,
        history: newHistory,
        status: 'ended' as const,
        showSettlement: true,
        lastSettlement: roundRecord,
        updatedAt: Date.now(),
      };
      set(finalState);
      saveCurrentGame(finalState);
      return;
    }

    const newExchangeRate = generateExchangeRate(state.exchangeRate);
    const newPendingOrders = generateOrders(nextRound, state.maxRounds);
    const newForwardRate = calculateForwardRate(newExchangeRate, 1);

    const updatedState = {
      ...state,
      round: nextRound,
      cash: endingCash,
      inventory: endingInventory,
      exchangeRate: newExchangeRate,
      forwardRate: newForwardRate,
      activeOrders: result.updatedOrders,
      activeContracts: result.updatedContracts,
      pendingOrders: newPendingOrders,
      history: newHistory,
      showSettlement: true,
      lastSettlement: roundRecord,
      updatedAt: Date.now(),
    };

    set(updatedState);
    saveCurrentGame(updatedState);
  },

  closeSettlement: () => {
    set({ showSettlement: false });
  },

  saveToHistory: () => {
    const state = get();
    const score = calculateFinalScore(state);
    saveGameToHistory(state, score);
  },

  loadSavedGame: (): boolean => {
    const saved = loadCurrentGame();
    if (saved) {
      set({
        ...saved,
        showSettlement: false,
        lastSettlement: null,
      });
      return true;
    }
    return false;
  },

  exportReport: (): string => {
    return '';
  },
}));
