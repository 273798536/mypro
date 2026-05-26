import { create } from 'zustand';
import {
  GameState,
  Difficulty,
  Order,
  Trade,
  GameEvent,
  ReplaySnapshot,
  ReplayData,
  SettlementReport,
} from '../engine/types';
import {
  DIFFICULTY_CONFIGS,
  GAME_CONFIG,
} from '../engine/config';
import {
  generateInitialOrderBook,
  generateNextPrice,
  updateOrderBook,
  checkOrderExecution,
  calculateInventoryPenalty,
  calculateUnrealizedPnL,
  calculateTradePnL,
} from '../engine/market';
import {
  generateRandomEvent,
  getActiveEvents,
} from '../engine/events';
import {
  createReplayData,
  generateSettlementReport,
} from '../engine/replay';
import { saveGameRecord } from '../utils/storage';

interface GameStore {
  gameState: GameState;
  replaySnapshots: ReplaySnapshot[];
  settlementReport: SettlementReport | null;
  replayData: ReplayData | null;
  isReplayMode: boolean;
  currentReplayIndex: number;
  replaySpeed: number;
  
  startGame: (difficulty: Difficulty) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  endGame: (reason: 'timeout' | 'bankrupt' | 'manual' | 'force_liquidation') => void;
  placeOrder: (side: 'buy' | 'sell', price: number, quantity: number) => boolean;
  cancelOrder: (orderId: string) => void;
  updateGame: (deltaTime: number) => void;
  
  loadReplay: (replayData: ReplayData) => void;
  startReplay: () => void;
  stepReplay: () => void;
  setReplaySpeed: (speed: number) => void;
  exitReplay: () => void;
  
  clearSettlement: () => void;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function createInitialState(difficulty: Difficulty): GameState {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const initialPrice = GAME_CONFIG.INITIAL_PRICE;
  
  return {
    status: 'playing',
    difficulty,
    timeRemaining: config.gameDuration,
    totalTime: config.gameDuration,
    currentPrice: initialPrice,
    inventory: 0,
    avgCost: initialPrice,
    cash: GAME_CONFIG.INITIAL_CASH,
    realizedPnL: 0,
    unrealizedPnL: 0,
    totalFees: 0,
    inventoryPenalty: 0,
    eventBonus: 0,
    score: 0,
    activeOrders: [],
    tradeHistory: [],
    events: [],
    orderBook: generateInitialOrderBook(initialPrice),
    priceHistory: [{ time: 0, price: initialPrice }],
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: createInitialState('beginner'),
  replaySnapshots: [],
  settlementReport: null,
  replayData: null,
  isReplayMode: false,
  currentReplayIndex: 0,
  replaySpeed: 1,

  startGame: (difficulty: Difficulty) => {
    const newState = createInitialState(difficulty);
    set({
      gameState: newState,
      replaySnapshots: [],
      settlementReport: null,
      isReplayMode: false,
    });
    
    setTimeout(() => {
      const state = get();
      if (state.gameState.status === 'playing') {
        const snapshot: ReplaySnapshot = {
          timestamp: Date.now(),
          gameState: JSON.parse(JSON.stringify(state.gameState)),
        };
        set({ replaySnapshots: [snapshot] });
      }
    }, 0);
  },

  pauseGame: () => {
    set(state => ({
      gameState: { ...state.gameState, status: 'paused' },
    }));
  },

  resumeGame: () => {
    set(state => ({
      gameState: { ...state.gameState, status: 'playing' },
    }));
  },

  restartGame: () => {
    const difficulty = get().gameState.difficulty;
    get().startGame(difficulty);
  },

  endGame: (reason) => {
    const state = get();
    const finalState = {
      ...state.gameState,
      status: 'ended' as const,
      endReason: reason,
      unrealizedPnL: calculateUnrealizedPnL(
        state.gameState.inventory,
        state.gameState.avgCost,
        state.gameState.currentPrice
      ),
    };
    
    finalState.score = finalState.realizedPnL + finalState.unrealizedPnL 
      - finalState.totalFees - finalState.inventoryPenalty + finalState.eventBonus;
    
    const report = generateSettlementReport(finalState, finalState.difficulty);
    const replayData = createReplayData(
      state.replaySnapshots,
      finalState.events,
      finalState.difficulty,
      finalState.score
    );
    
    saveGameRecord({
      id: generateId(),
      startTime: state.replaySnapshots[0]?.timestamp || Date.now(),
      endTime: Date.now(),
      difficulty: finalState.difficulty,
      score: finalState.score,
      realizedPnL: finalState.realizedPnL,
      totalFees: finalState.totalFees,
      inventoryPenalty: finalState.inventoryPenalty,
      tradeCount: finalState.tradeHistory.length,
      endReason: reason,
      replayData,
    });
    
    set({
      gameState: finalState,
      settlementReport: report,
      replayData,
    });
  },

  placeOrder: (side, price, quantity) => {
    const state = get();
    if (state.gameState.status !== 'playing') return false;
    
    const sameSideOrders = state.gameState.activeOrders.filter(o => o.side === side);
    if (sameSideOrders.length >= GAME_CONFIG.MAX_ORDERS_PER_SIDE) return false;
    
    const order: Order = {
      id: generateId(),
      side,
      price,
      quantity,
      timestamp: Date.now(),
      status: 'active',
    };
    
    set(state => ({
      gameState: {
        ...state.gameState,
        activeOrders: [...state.gameState.activeOrders, order],
      },
    }));
    
    return true;
  },

  cancelOrder: (orderId) => {
    set(state => ({
      gameState: {
        ...state.gameState,
        activeOrders: state.gameState.activeOrders.map(o =>
          o.id === orderId ? { ...o, status: 'cancelled' as const } : o
        ),
      },
    }));
  },

  updateGame: (deltaTime) => {
    const state = get();
    if (state.gameState.status !== 'playing' || state.isReplayMode) return;
    
    const config = DIFFICULTY_CONFIGS[state.gameState.difficulty];
    const gameTime = state.gameState.totalTime - state.gameState.timeRemaining;
    const currentTimeMs = Date.now();
    
    let newTimeRemaining = state.gameState.timeRemaining - deltaTime;
    if (newTimeRemaining <= 0) {
      get().endGame('timeout');
      return;
    }
    
    const activeEvents = getActiveEvents(state.gameState.events, gameTime * 1000);
    
    const trend = Math.sin(gameTime * 0.1) * 0.5;
    const newPrice = generateNextPrice(
      state.gameState.currentPrice,
      config.baseVolatility,
      trend,
      activeEvents
    );
    
    const newOrderBook = updateOrderBook(state.gameState.orderBook, newPrice, activeEvents);
    
    let feeMultiplier = 1;
    for (const event of activeEvents) {
      if (event.type === 'fee_change') {
        feeMultiplier = event.effect.feeMultiplier || 1;
      }
    }
    
    let newInventory = state.gameState.inventory;
    let newAvgCost = state.gameState.avgCost;
    let newCash = state.gameState.cash;
    let newRealizedPnL = state.gameState.realizedPnL;
    let newTotalFees = state.gameState.totalFees;
    let newTrades = [...state.gameState.tradeHistory];
    let updatedOrders = [...state.gameState.activeOrders];
    
    for (let i = 0; i < updatedOrders.length; i++) {
      const order = updatedOrders[i];
      if (order.status !== 'active') continue;
      
      const { executed, fillPrice } = checkOrderExecution(
        order,
        newOrderBook,
        newPrice
      );
      
      if (executed) {
        const fee = fillPrice * order.quantity * config.feeRate * feeMultiplier;
        const { pnl, newAvgCost: updatedAvgCost, newInventory: updatedInventory } = calculateTradePnL(
          order.side,
          fillPrice,
          order.quantity,
          newInventory,
          newAvgCost
        );
        
        newInventory = updatedInventory;
        newAvgCost = updatedAvgCost;
        newRealizedPnL += pnl;
        newTotalFees += fee;
        
        if (order.side === 'buy') {
          newCash -= fillPrice * order.quantity + fee;
        } else {
          newCash += fillPrice * order.quantity - fee;
        }
        
        const trade: Trade = {
          id: generateId(),
          side: order.side,
          price: fillPrice,
          quantity: order.quantity,
          fee,
          timestamp: currentTimeMs,
          pnlContribution: pnl,
        };
        newTrades.push(trade);
        updatedOrders[i] = { ...order, status: 'filled' };
      }
    }
    
    updatedOrders = updatedOrders.filter(o => o.status === 'active');
    
    const newUnrealizedPnL = calculateUnrealizedPnL(newInventory, newAvgCost, newPrice);
    const newInventoryPenalty = calculateInventoryPenalty(
      newInventory,
      newPrice,
      config.inventoryPenaltyCoeff
    );
    
    let newEvents = [...state.gameState.events];
    const newEvent = generateRandomEvent(state.gameState.difficulty, gameTime * 1000);
    if (newEvent) {
      newEvents.push(newEvent);
    }
    
    const newScore = newRealizedPnL + newUnrealizedPnL - newTotalFees - newInventoryPenalty 
      + state.gameState.eventBonus;
    
    if (newScore < GAME_CONFIG.FORCE_LIQUIDATION_THRESHOLD) {
      get().endGame('force_liquidation');
      return;
    }
    
    const newPriceHistory = [...state.gameState.priceHistory];
    if (newPriceHistory.length === 0 || 
        currentTimeMs - newPriceHistory[newPriceHistory.length - 1].time > 500) {
      newPriceHistory.push({ time: currentTimeMs, price: newPrice });
      if (newPriceHistory.length > 1000) {
        newPriceHistory.shift();
      }
    }
    
    const newState: GameState = {
      ...state.gameState,
      timeRemaining: newTimeRemaining,
      currentPrice: newPrice,
      inventory: newInventory,
      avgCost: newAvgCost,
      cash: newCash,
      realizedPnL: newRealizedPnL,
      unrealizedPnL: newUnrealizedPnL,
      totalFees: newTotalFees,
      inventoryPenalty: newInventoryPenalty,
      score: newScore,
      activeOrders: updatedOrders,
      tradeHistory: newTrades,
      events: newEvents,
      orderBook: newOrderBook,
      priceHistory: newPriceHistory,
    };
    
    const newSnapshots = [...state.replaySnapshots];
    if (newSnapshots.length === 0 || 
        currentTimeMs - newSnapshots[newSnapshots.length - 1].timestamp > GAME_CONFIG.SNAPSHOT_INTERVAL) {
      newSnapshots.push({
        timestamp: currentTimeMs,
        gameState: JSON.parse(JSON.stringify(newState)),
      });
    }
    
    set({
      gameState: newState,
      replaySnapshots: newSnapshots,
    });
  },

  loadReplay: (replayData) => {
    set({
      replayData,
      isReplayMode: true,
      currentReplayIndex: 0,
      gameState: replayData.snapshots[0]?.gameState || createInitialState('beginner'),
    });
  },

  startReplay: () => {
    set({ isReplayMode: true });
  },

  stepReplay: () => {
    const state = get();
    if (!state.replayData) return;
    
    const nextIndex = Math.min(
      state.currentReplayIndex + 1,
      state.replayData.snapshots.length - 1
    );
    
    set({
      currentReplayIndex: nextIndex,
      gameState: state.replayData.snapshots[nextIndex].gameState,
    });
  },

  setReplaySpeed: (speed) => {
    set({ replaySpeed: speed });
  },

  exitReplay: () => {
    set({
      isReplayMode: false,
      replayData: null,
      currentReplayIndex: 0,
    });
  },

  clearSettlement: () => {
    set({ settlementReport: null });
  },
}));
