import { create } from 'zustand';
import { 
  GameState, 
  Difficulty, 
  DifficultyConfig,
} from '../types/game';
import { SAMPLE_VALUES } from '../constants/game';
import { 
  createEmptyCache, 
  getDifficultyConfig, 
  generateRequest,
  processReadRequest,
  writeToCache,
  deleteFromCache,
  refreshCacheEntry,
  updateCacheTtl,
  preventBreakdown,
  createEvent,
  getRandomItem,
} from '../utils/gameUtils';

interface GameStore extends GameState {
  config: DifficultyConfig;
  setDifficulty: (difficulty: Difficulty) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetGame: () => void;
  finishGame: () => void;
  setSpeed: (speed: number) => void;
  selectCache: (id: string | null) => void;
  selectRequest: (id: string | null) => void;
  processRequest: (requestId: string) => void;
  handleRead: (key: string) => void;
  handleWrite: (key: string, value: string, makeDirty?: boolean) => void;
  handleDelete: (key: string) => void;
  handleRefresh: (entryId: string) => void;
  handlePreventBreakdown: (key: string) => void;
  tick: (delta: number) => void;
  addRequest: () => void;
}

const initialDifficulty: Difficulty = 'normal';
const initialConfig = getDifficultyConfig(initialDifficulty);

export const useGameStore = create<GameStore>((set, get) => ({
  status: 'idle',
  difficulty: initialDifficulty,
  config: initialConfig,
  score: 0,
  totalRequests: 0,
  cacheHits: 0,
  cache: createEmptyCache(initialConfig.gridSize),
  requestQueue: [],
  eventLog: [],
  startTime: 0,
  elapsedTime: 0,
  breakdownsPrevented: 0,
  breakdownsOccurred: 0,
  speed: 1,
  selectedCacheId: null,
  selectedRequestId: null,

  setDifficulty: (difficulty: Difficulty) => {
    const config = getDifficultyConfig(difficulty);
    set({ 
      difficulty, 
      config,
      cache: createEmptyCache(config.gridSize),
    });
  },

  startGame: () => {
    const { config } = get();
    set({
      status: 'playing',
      score: 0,
      totalRequests: 0,
      cacheHits: 0,
      cache: createEmptyCache(config.gridSize),
      requestQueue: [],
      eventLog: [],
      startTime: Date.now(),
      elapsedTime: 0,
      breakdownsPrevented: 0,
      breakdownsOccurred: 0,
      selectedCacheId: null,
      selectedRequestId: null,
    });
  },

  pauseGame: () => {
    set({ status: 'paused' });
  },

  resumeGame: () => {
    set({ status: 'playing' });
  },

  resetGame: () => {
    const { config } = get();
    set({
      status: 'idle',
      score: 0,
      totalRequests: 0,
      cacheHits: 0,
      cache: createEmptyCache(config.gridSize),
      requestQueue: [],
      eventLog: [],
      startTime: 0,
      elapsedTime: 0,
      breakdownsPrevented: 0,
      breakdownsOccurred: 0,
      selectedCacheId: null,
      selectedRequestId: null,
    });
  },

  finishGame: () => {
    set({ status: 'finished' });
  },

  setSpeed: (speed: number) => {
    set({ speed });
  },

  selectCache: (id: string | null) => {
    set({ selectedCacheId: id });
  },

  selectRequest: (id: string | null) => {
    set({ selectedRequestId: id });
  },

  processRequest: (requestId: string) => {
    const state = get();
    const request = state.requestQueue.find(r => r.id === requestId);
    if (!request) return;

    const { cache, config, score, cacheHits, totalRequests, eventLog } = state;
    let newCache = cache;
    const newEvents = [...eventLog];
    let newScore = score;
    let newCacheHits = cacheHits;

    if (request.type === 'read') {
      const result = processReadRequest(cache, request, config);
      newCache = result.cache;
      newEvents.push(...result.events);
      result.events.forEach(e => {
        newScore += e.scoreChange;
      });
      if (result.isHit) {
        newCacheHits++;
      }
    } else if (request.type === 'write') {
      const makeDirty = Math.random() < config.dirtyProbability;
      const result = writeToCache(
        cache, 
        request.key, 
        request.expectedValue || getRandomItem(SAMPLE_VALUES), 
        config,
        makeDirty
      );
      newCache = result.cache;
      newEvents.push(...result.events);
      result.events.forEach(e => {
        newScore += e.scoreChange;
      });
    } else if (request.type === 'delete') {
      const result = deleteFromCache(cache, request.key);
      newCache = result.cache;
      newEvents.push(...result.events);
    }

    const newQueue = state.requestQueue.filter(r => r.id !== requestId);
    const breakdownsPrevented = newEvents.filter(e => e.type === 'breakdown_prevented').length;
    const breakdownsOccurred = newEvents.filter(e => e.type === 'breakdown').length;

    set({
      cache: newCache,
      requestQueue: newQueue,
      eventLog: newEvents,
      score: newScore,
      cacheHits: newCacheHits,
      totalRequests: totalRequests + 1,
      breakdownsPrevented,
      breakdownsOccurred,
    });
  },

  handleRead: (key: string) => {
    const state = get();
    const { cache, config, score, cacheHits, eventLog, requestQueue } = state;
    const request = requestQueue.find(r => r.key === key && r.type === 'read');
    
    if (!request) return;

    const result = processReadRequest(cache, request, config);
    const newEvents = [...eventLog, ...result.events];
    let newScore = score;
    result.events.forEach(e => {
      newScore += e.scoreChange;
    });

    const breakdownsPrevented = newEvents.filter(e => e.type === 'breakdown_prevented').length;
    const breakdownsOccurred = newEvents.filter(e => e.type === 'breakdown').length;

    set({
      cache: result.cache,
      requestQueue: requestQueue.filter(r => r.id !== request.id),
      eventLog: newEvents,
      score: newScore,
      cacheHits: result.isHit ? cacheHits + 1 : cacheHits,
      totalRequests: state.totalRequests + 1,
      breakdownsPrevented,
      breakdownsOccurred,
    });
  },

  handleWrite: (key: string, value: string, makeDirty: boolean = false) => {
    const state = get();
    const { cache, config, score, eventLog, requestQueue } = state;
    
    const result = writeToCache(cache, key, value, config, makeDirty);
    const newEvents = [...eventLog, ...result.events];
    let newScore = score;
    result.events.forEach(e => {
      newScore += e.scoreChange;
    });

    const relatedRequest = requestQueue.find(r => r.key === key);

    set({
      cache: result.cache,
      requestQueue: relatedRequest 
        ? requestQueue.filter(r => r.id !== relatedRequest.id) 
        : requestQueue,
      eventLog: newEvents,
      score: newScore,
      totalRequests: relatedRequest ? state.totalRequests + 1 : state.totalRequests,
    });
  },

  handleDelete: (key: string) => {
    const state = get();
    const { cache, eventLog, requestQueue } = state;
    
    const result = deleteFromCache(cache, key);
    const newEvents = [...eventLog, ...result.events];

    const relatedRequest = requestQueue.find(r => r.key === key && r.type === 'delete');

    set({
      cache: result.cache,
      requestQueue: relatedRequest 
        ? requestQueue.filter(r => r.id !== relatedRequest.id) 
        : requestQueue,
      eventLog: newEvents,
      totalRequests: relatedRequest ? state.totalRequests + 1 : state.totalRequests,
    });
  },

  handleRefresh: (entryId: string) => {
    const state = get();
    const { cache, config, score, eventLog } = state;
    
    const result = refreshCacheEntry(cache, entryId, config);
    const newEvents = [...eventLog, ...result.events];
    let newScore = score;
    result.events.forEach(e => {
      newScore += e.scoreChange;
    });

    set({
      cache: result.cache,
      eventLog: newEvents,
      score: newScore,
    });
  },

  handlePreventBreakdown: (key: string) => {
    const state = get();
    const { cache, config, score, eventLog } = state;
    
    const result = preventBreakdown(cache, key, config);
    const newEvents = [...eventLog, ...result.events];
    let newScore = score;
    result.events.forEach(e => {
      newScore += e.scoreChange;
    });

    const breakdownsPrevented = newEvents.filter(e => e.type === 'breakdown_prevented').length;

    set({
      cache: result.cache,
      eventLog: newEvents,
      score: newScore,
      breakdownsPrevented,
    });
  },

  tick: (delta: number) => {
    const state = get();
    if (state.status !== 'playing') return;

    const { 
      cache, 
      config, 
      eventLog, 
      startTime, 
      requestQueue, 
      score,
      speed,
    } = state;

    const adjustedDelta = delta * speed;
    const newCache = updateCacheTtl(cache, adjustedDelta);
    const newElapsedTime = Date.now() - startTime;

    const now = Date.now();
    const timeoutEvents: typeof eventLog = [];
    let newScore = score;
    const remainingQueue = requestQueue.filter(request => {
      const age = now - request.createdAt;
      if (age > request.timeout) {
        const event = createEvent('timeout', request.key, {
          waited: age,
          timeout: request.timeout,
        });
        timeoutEvents.push(event);
        newScore += event.scoreChange;
        return false;
      }
      return true;
    });

    if (newElapsedTime >= config.gameDuration) {
      set({ status: 'finished' });
      return;
    }

    set({
      cache: newCache,
      requestQueue: remainingQueue,
      eventLog: [...eventLog, ...timeoutEvents],
      elapsedTime: newElapsedTime,
      score: newScore,
    });
  },

  addRequest: () => {
    const state = get();
    if (state.status !== 'playing') return;

    const { config, requestQueue } = state;
    const newRequest = generateRequest(config);
    
    set({
      requestQueue: [...requestQueue, newRequest],
    });
  },
}));
