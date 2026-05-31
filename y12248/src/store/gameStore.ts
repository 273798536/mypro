import { create } from 'zustand';
import type { Order, SourceRequest } from '../types/order';
import type { CacheEntry } from '../types/cache';
import type { Evidence } from '../types/evidence';
import type { 
  GameState, 
  ScoreBreakdown, 
  GameStats,
} from '../types/game';
import {
  INITIAL_SCORE_BREAKDOWN,
  INITIAL_STATS,
  SOURCE_LIMIT,
  GAME_DURATION,
} from '../types/game';
import type { CacheStrategy } from '../types/cache';
import type { QueueScheduler } from '../types/queue';

interface GameStore extends GameState {
  orders: Order[];
  sourceRequests: SourceRequest[];
  cacheEntries: CacheEntry[];
  evidence: Evidence[];
  eventLog: string[];
  
  setGameStatus: (status: GameState['status']) => void;
  setCacheStrategy: (strategy: CacheStrategy) => void;
  setQueueScheduler: (scheduler: QueueScheduler) => void;
  setSpeed: (speed: GameState['speed']) => void;
  
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  
  addOrder: (order: Order) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  removeOrder: (id: string) => void;
  
  addSourceRequest: (request: SourceRequest) => void;
  updateSourceRequest: (id: string, updates: Partial<SourceRequest>) => void;
  removeSourceRequest: (id: string) => void;
  
  setCacheEntries: (entries: CacheEntry[]) => void;
  
  addScore: (change: number, breakdown: Partial<ScoreBreakdown>) => void;
  updateStats: (updates: Partial<GameStats>) => void;
  
  addEvidence: (evidence: Evidence) => void;
  addEventLog: (message: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  status: 'idle',
  startTime: null,
  endTime: null,
  pausedAt: null,
  totalPauseTime: 0,
  speed: 1,
  cacheStrategy: 'LRU',
  queueScheduler: 'priority',
  score: 0,
  scoreBreakdown: {
    base: 0,
    cacheHitBonus: 0,
    dirtyDataPenalty: 0,
    sourceLimitPenalty: 0,
    complaintPenalty: 0,
    breakdownPenalty: 0,
  },
  stats: {
    totalOrders: 0,
    completedOrders: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheExpired: 0,
    sourceRequests: 0,
    concurrentSource: 0,
    maxConcurrentSource: 0,
    dirtySpreads: 0,
    cacheBreakdowns: 0,
    expiredMisreads: 0,
    customerComplaints: 0,
  },
  sourceLimit: SOURCE_LIMIT,
  gameDuration: GAME_DURATION,
  
  orders: [],
  sourceRequests: [],
  cacheEntries: [],
  evidence: [],
  eventLog: [],

  setGameStatus: (status) => set({ status }),
  
  setCacheStrategy: (strategy) => {
    set({ cacheStrategy: strategy });
    get().addEventLog(`切换缓存策略为: ${strategy}`);
  },
  
  setQueueScheduler: (scheduler) => {
    set({ queueScheduler: scheduler });
    get().addEventLog(`切换队列调度为: ${scheduler}`);
  },
  
  setSpeed: (speed) => set({ speed }),

  startGame: () => {
    const now = performance.now();
    set({
      status: 'playing',
      startTime: now,
      pausedAt: null,
      totalPauseTime: 0,
      score: 0,
      scoreBreakdown: {
        base: 0,
        cacheHitBonus: 0,
        dirtyDataPenalty: 0,
        sourceLimitPenalty: 0,
        complaintPenalty: 0,
        breakdownPenalty: 0,
      },
      stats: {
        totalOrders: 0,
        completedOrders: 0,
        cacheHits: 0,
        cacheMisses: 0,
        cacheExpired: 0,
        sourceRequests: 0,
        concurrentSource: 0,
        maxConcurrentSource: 0,
        dirtySpreads: 0,
        cacheBreakdowns: 0,
        expiredMisreads: 0,
        customerComplaints: 0,
      },
      orders: [],
      sourceRequests: [],
      evidence: [],
      eventLog: ['游戏开始！'],
    });
  },

  pauseGame: () => {
    const { status, startTime } = get();
    if (status === 'playing' && startTime) {
      set({
        status: 'paused',
        pausedAt: performance.now(),
      });
      get().addEventLog('游戏暂停');
    }
  },

  resumeGame: () => {
    const { status, pausedAt, totalPauseTime } = get();
    if (status === 'paused' && pausedAt) {
      const pauseDuration = performance.now() - pausedAt;
      set({
        status: 'playing',
        pausedAt: null,
        totalPauseTime: totalPauseTime + pauseDuration,
      });
      get().addEventLog('游戏继续');
    }
  },

  endGame: () => {
    set({
      status: 'ended',
      endTime: performance.now(),
    });
    get().addEventLog('游戏结束');
  },

  resetGame: () => {
    set({
      status: 'idle',
      startTime: null,
      endTime: null,
      pausedAt: null,
      totalPauseTime: 0,
      speed: 1,
      score: 0,
      scoreBreakdown: {
        base: 0,
        cacheHitBonus: 0,
        dirtyDataPenalty: 0,
        sourceLimitPenalty: 0,
        complaintPenalty: 0,
        breakdownPenalty: 0,
      },
      stats: {
        totalOrders: 0,
        completedOrders: 0,
        cacheHits: 0,
        cacheMisses: 0,
        cacheExpired: 0,
        sourceRequests: 0,
        concurrentSource: 0,
        maxConcurrentSource: 0,
        dirtySpreads: 0,
        cacheBreakdowns: 0,
        expiredMisreads: 0,
        customerComplaints: 0,
      },
      orders: [],
      sourceRequests: [],
      cacheEntries: [],
      evidence: [],
      eventLog: ['游戏已重置'],
    });
  },

  addOrder: (order) => {
    set((state) => ({
      orders: [...state.orders, order],
      stats: {
        ...state.stats,
        totalOrders: state.stats.totalOrders + 1,
      },
    }));
  },

  updateOrder: (id, updates) => {
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === id ? { ...o, ...updates } : o
      ),
    }));
  },

  removeOrder: (id) => {
    set((state) => ({
      orders: state.orders.filter((o) => o.id !== id),
    }));
  },

  addSourceRequest: (request) => {
    set((state) => {
      const concurrentSource = state.stats.concurrentSource + 1;
      return {
        sourceRequests: [...state.sourceRequests, request],
        stats: {
          ...state.stats,
          sourceRequests: state.stats.sourceRequests + 1,
          concurrentSource,
          maxConcurrentSource: Math.max(state.stats.maxConcurrentSource, concurrentSource),
        },
      };
    });
  },

  updateSourceRequest: (id, updates) => {
    set((state) => ({
      sourceRequests: state.sourceRequests.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
  },

  removeSourceRequest: (id) => {
    set((state) => ({
      sourceRequests: state.sourceRequests.filter((r) => r.id !== id),
      stats: {
        ...state.stats,
        concurrentSource: Math.max(0, state.stats.concurrentSource - 1),
      },
    }));
  },

  setCacheEntries: (entries) => set({ cacheEntries: entries }),

  addScore: (change, breakdown) => {
    set((state) => ({
      score: state.score + change,
      scoreBreakdown: {
        base: state.scoreBreakdown.base + (breakdown.base || 0),
        cacheHitBonus: state.scoreBreakdown.cacheHitBonus + (breakdown.cacheHitBonus || 0),
        dirtyDataPenalty: state.scoreBreakdown.dirtyDataPenalty + (breakdown.dirtyDataPenalty || 0),
        sourceLimitPenalty: state.scoreBreakdown.sourceLimitPenalty + (breakdown.sourceLimitPenalty || 0),
        complaintPenalty: state.scoreBreakdown.complaintPenalty + (breakdown.complaintPenalty || 0),
        breakdownPenalty: state.scoreBreakdown.breakdownPenalty + (breakdown.breakdownPenalty || 0),
      },
    }));
  },

  updateStats: (updates) => {
    set((state) => ({
      stats: { ...state.stats, ...updates },
    }));
  },

  addEvidence: (evidence) => {
    set((state) => ({
      evidence: [...state.evidence, evidence],
    }));
  },

  addEventLog: (message) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });
    set((state) => ({
      eventLog: [...state.eventLog.slice(-99), `[${timeStr}] ${message}`],
    }));
  },
}));
