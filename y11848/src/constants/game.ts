import { DifficultyConfig } from '../types/game';

export const DIFFICULTY_CONFIGS: Record<string, DifficultyConfig> = {
  easy: {
    gridSize: 3,
    requestInterval: 2500,
    hotKeyProbability: 0.05,
    dirtyProbability: 0.05,
    gameDuration: 90000,
    requestTimeout: 8000,
    cacheTtl: 15000,
  },
  normal: {
    gridSize: 4,
    requestInterval: 1500,
    hotKeyProbability: 0.15,
    dirtyProbability: 0.10,
    gameDuration: 120000,
    requestTimeout: 6000,
    cacheTtl: 12000,
  },
  hard: {
    gridSize: 5,
    requestInterval: 1000,
    hotKeyProbability: 0.30,
    dirtyProbability: 0.20,
    gameDuration: 180000,
    requestTimeout: 4000,
    cacheTtl: 10000,
  },
};

export const SCORE_RULES: Record<string, number> = {
  hit: 10,
  miss: 0,
  dirty_read: -20,
  expired_read: -15,
  breakdown: -100,
  breakdown_prevented: 50,
  timeout: -30,
  write: 5,
  delete: 0,
  refresh: 5,
  evict: -5,
};

export const SAMPLE_KEYS = [
  'user:1001', 'user:1002', 'user:1003', 'user:1004', 'user:1005',
  'product:2001', 'product:2002', 'product:2003', 'product:2004', 'product:2005',
  'order:3001', 'order:3002', 'order:3003', 'order:3004', 'order:3005',
  'config:app', 'config:db', 'config:api',
  'session:abc', 'session:xyz', 'session:123',
];

export const SAMPLE_VALUES = [
  '{"name":"张三","age":25}',
  '{"name":"李四","age":30}',
  '{"name":"王五","age":28}',
  '{"price":99.99,"stock":100}',
  '{"price":199.99,"stock":50}',
  '{"status":"pending","total":599}',
  '{"status":"paid","total":1299}',
  '{"theme":"dark","lang":"zh"}',
  '{"maxConn":100,"timeout":30}',
  '{"userId":1001,"expireAt":1700000000}',
];

export const EVENT_MESSAGES: Record<string, (key?: string) => string> = {
  hit: (key) => `缓存命中: ${key}`,
  miss: (key) => `缓存未命中: ${key}`,
  dirty_read: (key) => `脏数据读取: ${key}`,
  expired_read: (key) => `过期数据读取: ${key}`,
  breakdown: (key) => `⚠️ 缓存击穿发生: ${key}`,
  breakdown_prevented: (key) => `✅ 成功拦截缓存击穿: ${key}`,
  timeout: (key) => `请求超时: ${key}`,
  write: (key) => `写入缓存: ${key}`,
  delete: (key) => `删除缓存: ${key}`,
  refresh: (key) => `刷新缓存: ${key}`,
  evict: (key) => `淘汰缓存: ${key}`,
};

export const PENALTY_EXPLANATIONS: Record<string, { reason: string; suggestion: string }> = {
  dirty_read: {
    reason: '读取到了脏数据。这通常是因为数据库更新后没有及时删除或更新缓存。',
    suggestion: '建议采用"先更新数据库，再删除缓存"的模式，或使用消息队列保证最终一致性。'
  },
  expired_read: {
    reason: '读取到了已过期的数据。缓存TTL设置可能过长，或者没有主动更新策略。',
    suggestion: '根据数据更新频率合理设置TTL，对热点数据可以考虑后台异步刷新。'
  },
  breakdown: {
    reason: '发生了缓存击穿！热点key过期瞬间，大量请求直接打到数据库。',
    suggestion: '使用互斥锁、永不过期策略，或在热点key即将过期时提前预热。'
  },
  timeout: {
    reason: '请求处理超时。缓存操作不及时导致请求堆积。',
    suggestion: '优化缓存策略，优先处理高优先级请求，避免缓存操作过于频繁。'
  },
  evict: {
    reason: '缓存被淘汰。可能是缓存空间不足，或者淘汰策略不合理。',
    suggestion: '根据访问模式调整缓存大小，考虑使用LRU或LFU淘汰策略。'
  },
};
