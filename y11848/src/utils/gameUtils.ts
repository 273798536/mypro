import { 
  CacheEntry, 
  Request, 
  GameEvent, 
  DifficultyConfig,
  GameState,
  SettlementReport,
  PenaltyItem,
} from '../types/game';
import { 
  DIFFICULTY_CONFIGS, 
  SCORE_RULES, 
  SAMPLE_KEYS, 
  SAMPLE_VALUES,
  EVENT_MESSAGES,
  PENALTY_EXPLANATIONS,
} from '../constants/game';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

export const getRandomItem = <T>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};

export const createEmptyCache = (size: number): CacheEntry[] => {
  const cache: CacheEntry[] = [];
  const totalSlots = size * size;
  for (let i = 0; i < totalSlots; i++) {
    cache.push({
      id: `slot-${i}`,
      key: '',
      value: '',
      ttl: 0,
      maxTtl: 0,
      status: 'empty',
      lastAccessed: 0,
    });
  }
  return cache;
};

export const generateRequest = (config: DifficultyConfig): Request => {
  const types: ('read' | 'write' | 'delete')[] = ['read', 'read', 'read', 'write', 'delete'];
  const type = getRandomItem(types);
  const key = getRandomItem(SAMPLE_KEYS);
  const isHotKey = Math.random() < config.hotKeyProbability;
  
  return {
    id: generateId(),
    type,
    key,
    expectedValue: type === 'write' ? getRandomItem(SAMPLE_VALUES) : undefined,
    timeout: config.requestTimeout,
    createdAt: Date.now(),
    isHotKey,
    penalty: isHotKey ? 50 : 30,
  };
};

export const createEvent = (
  type: GameEvent['type'],
  key?: string,
  details?: Record<string, any>
): GameEvent => {
  return {
    id: generateId(),
    timestamp: Date.now(),
    type,
    key,
    message: EVENT_MESSAGES[type](key),
    scoreChange: SCORE_RULES[type] || 0,
    details,
  };
};

export const findCacheByKey = (cache: CacheEntry[], key: string): CacheEntry | undefined => {
  return cache.find(entry => entry.key === key && entry.status !== 'empty');
};

export const findEmptySlot = (cache: CacheEntry[]): CacheEntry | undefined => {
  return cache.find(entry => entry.status === 'empty');
};

export const findLruEntry = (cache: CacheEntry[]): CacheEntry | undefined => {
  const validEntries = cache.filter(e => e.status !== 'empty');
  if (validEntries.length === 0) return undefined;
  return validEntries.reduce((lru, entry) => 
    entry.lastAccessed < lru.lastAccessed ? entry : lru
  );
};

export const processReadRequest = (
  cache: CacheEntry[],
  request: Request,
  config: DifficultyConfig
): { cache: CacheEntry[]; events: GameEvent[]; isHit: boolean } => {
  const events: GameEvent[] = [];
  const existingEntry = findCacheByKey(cache, request.key);
  
  if (!existingEntry) {
    events.push(createEvent('miss', request.key));
    return { cache, events, isHit: false };
  }
  
  if (existingEntry.status === 'dirty') {
    events.push(createEvent('dirty_read', request.key, {
      dirtySource: existingEntry.dirtySource,
      value: existingEntry.value,
    }));
    return { cache, events, isHit: false };
  }
  
  if (existingEntry.status === 'expired') {
    events.push(createEvent('expired_read', request.key, {
      remainingTtl: existingEntry.ttl,
    }));
    return { cache, events, isHit: false };
  }
  
  if (request.isHotKey && existingEntry.ttl < config.cacheTtl * 0.2) {
    events.push(createEvent('breakdown', request.key, {
      ttlRemaining: existingEntry.ttl,
      isHotKey: true,
    }));
    const newCache = cache.map(entry => 
      entry.id === existingEntry.id
        ? { ...entry, lastAccessed: Date.now() }
        : entry
    );
    return { cache: newCache, events, isHit: false };
  }
  
  events.push(createEvent('hit', request.key));
  const newCache = cache.map(entry => 
    entry.id === existingEntry.id
      ? { ...entry, lastAccessed: Date.now() }
      : entry
  );
  
  return { cache: newCache, events, isHit: true };
};

export const writeToCache = (
  cache: CacheEntry[],
  key: string,
  value: string,
  config: DifficultyConfig,
  makeDirty: boolean = false
): { cache: CacheEntry[]; events: GameEvent[] } => {
  const events: GameEvent[] = [];
  let targetEntry = findCacheByKey(cache, key);
  
  if (!targetEntry) {
    targetEntry = findEmptySlot(cache);
    if (!targetEntry) {
      const lruEntry = findLruEntry(cache);
      if (lruEntry) {
        events.push(createEvent('evict', lruEntry.key));
        targetEntry = lruEntry;
      }
    }
  }
  
  if (!targetEntry) {
    return { cache, events };
  }
  
  const newCache = cache.map(entry => {
    if (entry.id === targetEntry!.id) {
      return {
        ...entry,
        key,
        value,
        ttl: makeDirty ? config.cacheTtl * 0.5 : config.cacheTtl,
        maxTtl: config.cacheTtl,
        status: (makeDirty ? 'dirty' : 'valid') as 'dirty' | 'valid',
        dirtySource: makeDirty ? 'simulated_db_inconsistency' : undefined,
        lastAccessed: Date.now(),
      };
    }
    return entry;
  });
  
  events.push(createEvent('write', key));
  
  return { cache: newCache, events };
};

export const deleteFromCache = (
  cache: CacheEntry[],
  key: string
): { cache: CacheEntry[]; events: GameEvent[] } => {
  const events: GameEvent[] = [];
  const existingEntry = findCacheByKey(cache, key);
  
  if (!existingEntry) {
    return { cache, events };
  }
  
  const newCache = cache.map(entry => {
    if (entry.id === existingEntry.id) {
      return {
        ...entry,
        key: '',
        value: '',
        ttl: 0,
        maxTtl: 0,
        status: 'empty' as const,
        dirtySource: undefined,
        lastAccessed: 0,
      };
    }
    return entry;
  });
  
  events.push(createEvent('delete', key));
  
  return { cache: newCache, events };
};

export const refreshCacheEntry = (
  cache: CacheEntry[],
  entryId: string,
  config: DifficultyConfig
): { cache: CacheEntry[]; events: GameEvent[] } => {
  const events: GameEvent[] = [];
  const entry = cache.find(e => e.id === entryId);
  
  if (!entry || entry.status === 'empty') {
    return { cache, events };
  }
  
  const newCache = cache.map(e => {
    if (e.id === entryId) {
      return {
        ...e,
        ttl: config.cacheTtl,
        status: 'valid' as const,
        dirtySource: undefined,
        lastAccessed: Date.now(),
      };
    }
    return e;
  });
  
  events.push(createEvent('refresh', entry.key));
  
  return { cache: newCache, events };
};

export const updateCacheTtl = (cache: CacheEntry[], delta: number): CacheEntry[] => {
  return cache.map(entry => {
    if (entry.status === 'empty') return entry;
    
    const newTtl = entry.ttl - delta;
    
    if (newTtl <= 0) {
      return {
        ...entry,
        ttl: 0,
        status: 'expired' as const,
      };
    }
    
    return {
      ...entry,
      ttl: newTtl,
    };
  });
};

export const preventBreakdown = (
  cache: CacheEntry[],
  key: string,
  config: DifficultyConfig
): { cache: CacheEntry[]; events: GameEvent[] } => {
  const events: GameEvent[] = [];
  const entry = findCacheByKey(cache, key);
  
  if (!entry) {
    const { cache: newCache, events: writeEvents } = writeToCache(
      cache, 
      key, 
      getRandomItem(SAMPLE_VALUES), 
      config
    );
    events.push(createEvent('breakdown_prevented', key, { method: 'pre-warm' }));
    return { cache: newCache, events: [...events, ...writeEvents] };
  }
  
  const newCache = cache.map(e => {
    if (e.id === entry.id) {
      return {
        ...e,
        ttl: config.cacheTtl,
        status: 'valid' as const,
        dirtySource: undefined,
      };
    }
    return e;
  });
  
  events.push(createEvent('breakdown_prevented', key, { method: 'refresh' }));
  
  return { cache: newCache, events };
};

export const generateSettlementReport = (state: GameState): SettlementReport => {
  const { eventLog, score, cacheHits, totalRequests } = state;
  
  const penalties: PenaltyItem[] = eventLog
    .filter(e => e.scoreChange < 0)
    .map(event => ({
      event,
      reason: PENALTY_EXPLANATIONS[event.type]?.reason || '未知错误',
      suggestion: PENALTY_EXPLANATIONS[event.type]?.suggestion || '请检查操作流程',
    }));
  
  const breakdownPrevented = eventLog.filter(e => e.type === 'breakdown_prevented');
  const breakdownOccurred = eventLog.filter(e => e.type === 'breakdown');
  
  return {
    totalScore: score,
    hitRate: totalRequests > 0 ? cacheHits / totalRequests : 0,
    totalRequests,
    totalHits: cacheHits,
    events: eventLog,
    penalties,
    breakdownAnalysis: {
      total: breakdownPrevented.length + breakdownOccurred.length,
      prevented: breakdownPrevented.length,
      occurred: breakdownOccurred.length,
      preventedDetails: breakdownPrevented,
      occurredDetails: breakdownOccurred,
    },
    stats: {
      dirtyReads: eventLog.filter(e => e.type === 'dirty_read').length,
      expiredReads: eventLog.filter(e => e.type === 'expired_read').length,
      timeouts: eventLog.filter(e => e.type === 'timeout').length,
      breakdowns: breakdownOccurred.length,
    },
  };
};

export const exportReportToJson = (report: SettlementReport): string => {
  const exportData = {
    exportTime: new Date().toISOString(),
    summary: {
      totalScore: report.totalScore,
      hitRate: `${(report.hitRate * 100).toFixed(2)}%`,
      totalRequests: report.totalRequests,
      cacheHits: report.totalHits,
    },
    breakdownAnalysis: {
      totalBreakdownAttempts: report.breakdownAnalysis.total,
      breakdownsPrevented: report.breakdownAnalysis.prevented,
      breakdownsOccurred: report.breakdownAnalysis.occurred,
      preventionRate: report.breakdownAnalysis.total > 0 
        ? `${(report.breakdownAnalysis.prevented / report.breakdownAnalysis.total * 100).toFixed(2)}%`
        : 'N/A',
      wasBreakdownBlocked: report.breakdownAnalysis.occurred === 0,
      criticalMessage: report.breakdownAnalysis.occurred === 0
        ? '✅ 所有缓存击穿都被成功拦截！'
        : `⚠️ 有 ${report.breakdownAnalysis.occurred} 次缓存击穿未被拦截`,
      details: {
        prevented: report.breakdownAnalysis.preventedDetails.map(e => ({
          time: new Date(e.timestamp).toLocaleTimeString(),
          key: e.key,
          method: e.details?.method,
        })),
        occurred: report.breakdownAnalysis.occurredDetails.map(e => ({
          time: new Date(e.timestamp).toLocaleTimeString(),
          key: e.key,
          ttlRemaining: e.details?.ttlRemaining,
        })),
      },
    },
    penaltySummary: report.penalties.map(p => ({
      time: new Date(p.event.timestamp).toLocaleTimeString(),
      type: p.event.type,
      key: p.event.key,
      scoreChange: p.event.scoreChange,
      reason: p.reason,
      suggestion: p.suggestion,
    })),
  };
  
  return JSON.stringify(exportData, null, 2);
};

export const getDifficultyConfig = (difficulty: string): DifficultyConfig => {
  return DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS.normal;
};

export const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const formatTtl = (ms: number): string => {
  if (ms <= 0) return '已过期';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};
