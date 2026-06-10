/**
 * LocalStorage 封装工具
 * 提供类型安全、带过期时间、事件监听等增强功能的本地存储操作
 */

/**
 * 存储项元数据
 */
interface StorageItemMeta<T> {
  /** 存储的数据 */
  value: T;
  /** 过期时间戳 (毫秒), null 表示永不过期 */
  expiresAt: number | null;
  /** 创建时间戳 (毫秒) */
  createdAt: number;
  /** 最后更新时间戳 (毫秒) */
  updatedAt: number;
  /** 数据版本号 (用于迁移) */
  version: number;
}

/**
 * 存储键名枚举 - 集中管理所有存储键
 */
export const STORAGE_KEYS = {
  /** 应用状态 */
  APP_STATE: 'app_state',
  /** 用户偏好 */
  USER_PREFERENCES: 'user_preferences',
  /** 样本数据缓存 */
  SAMPLES_CACHE: 'samples_cache',
  /** 物种同义词缓存 */
  SPECIES_SYNONYMS_CACHE: 'species_synonyms_cache',
  /** 分组指标配置 */
  METRIC_CONFIGS: 'metric_configs',
  /** 版本历史缓存 */
  VERSION_HISTORY: 'version_history',
  /** 异常记录缓存 */
  ANOMALIES_CACHE: 'anomalies_cache',
  /** 结论记录缓存 */
  CONCLUSIONS_CACHE: 'conclusions_cache',
  /** 报告历史 */
  REPORT_HISTORY: 'report_history',
  /** 导入批次历史 */
  IMPORT_BATCH_HISTORY: 'import_batch_history',
  /** 已完成首次引导 */
  ONBOARDING_COMPLETED: 'onboarding_completed',
  /** 工作流草稿 */
  WORKFLOW_DRAFT: 'workflow_draft',
  /** 最近打开的批号 */
  RECENT_BATCHES: 'recent_batches',
} as const;

/** 存储键名类型 */
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * 存储配置选项
 */
interface StorageOptions {
  /** 过期时间 (毫秒), 默认 null = 永不过期 */
  ttl?: number | null;
  /** 数据版本号, 默认 1 */
  version?: number;
  /** 是否在 JSON 序列化失败时回退到字符串存储, 默认 false */
  fallbackToString?: boolean;
}

/** 默认存储配置 */
const DEFAULT_OPTIONS: Required<Omit<StorageOptions, 'ttl'>> & { ttl: null } = {
  ttl: null,
  version: 1,
  fallbackToString: false,
};

/**
 * 存储变更事件类型
 */
export interface StorageChangeEvent<T = unknown> {
  /** 变更的键名 */
  key: string;
  /** 旧值 */
  oldValue: T | null;
  /** 新值 */
  newValue: T | null;
  /** 变更类型 */
  action: 'set' | 'remove' | 'clear' | 'expired';
  /** 变更时间戳 */
  timestamp: number;
}

/** 存储变更监听器类型 */
export type StorageChangeListener<T = unknown> = (event: StorageChangeEvent<T>) => void;

/** 全局监听器映射表 */
const listeners = new Map<string, Set<StorageChangeListener>>();

/** ============================================
 *  基础工具函数
 * ============================================ */

/**
 * 检测当前环境是否支持 LocalStorage
 */
export function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * 生成存储项元数据
 */
function wrapWithMeta<T>(value: T, options: Required<StorageOptions>): StorageItemMeta<T> {
  const now = Date.now();
  return {
    value,
    expiresAt: options.ttl !== null ? now + options.ttl : null,
    createdAt: now,
    updatedAt: now,
    version: options.version,
  };
}

/**
 * 检查存储项是否已过期
 */
function isExpired<T>(meta: StorageItemMeta<T>): boolean {
  if (meta.expiresAt === null) {
    return false;
  }
  return Date.now() > meta.expiresAt;
}

/**
 * 触发变更事件
 */
function emitChange<T>(event: StorageChangeEvent<T>): void {
  const keyListeners = listeners.get(event.key);
  if (keyListeners) {
    keyListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error(`[Storage] 监听器执行失败 (key: ${event.key}):`, error);
      }
    });
  }

  const wildcardListeners = listeners.get('*');
  if (wildcardListeners) {
    wildcardListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[Storage] 全局监听器执行失败:', error);
      }
    });
  }
}

/** ============================================
 *  核心读写方法
 * ============================================ */

/**
 * 存储数据到 LocalStorage
 * @param key 存储键名
 * @param value 要存储的值
 * @param options 存储配置
 * @returns 是否存储成功
 */
export function setStorage<T>(
  key: string,
  value: T,
  options: StorageOptions = {}
): boolean {
  if (!isLocalStorageAvailable()) {
    console.warn('[Storage] LocalStorage 不可用');
    return false;
  }

  const opts: Required<StorageOptions> = { ...DEFAULT_OPTIONS, ...options };

  try {
    let serializedValue: string;

    try {
      const meta = wrapWithMeta(value, opts);
      serializedValue = JSON.stringify(meta);
    } catch (serializeError) {
      if (opts.fallbackToString && typeof value === 'string') {
        const meta = wrapWithMeta(value, opts);
        serializedValue = JSON.stringify(meta);
      } else {
        console.error(`[Storage] 序列化失败 (key: ${key}):`, serializeError);
        return false;
      }
    }

    const oldMeta = getRawMeta<T>(key);
    const oldValue = oldMeta ? oldMeta.value : null;

    window.localStorage.setItem(key, serializedValue);

    emitChange<T>({
      key,
      oldValue,
      newValue: value,
      action: 'set',
      timestamp: Date.now(),
    });

    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error(`[Storage] 存储空间已满 (key: ${key})`);
    } else {
      console.error(`[Storage] 写入失败 (key: ${key}):`, error);
    }
    return false;
  }
}

/**
 * 获取原始存储元数据 (内部使用)
 */
function getRawMeta<T>(key: string): StorageItemMeta<T> | null {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      return null;
    }

    const meta = JSON.parse(raw) as StorageItemMeta<T>;
    if (!meta || typeof meta !== 'object' || !('value' in meta)) {
      return null;
    }

    return meta;
  } catch {
    return null;
  }
}

/**
 * 从 LocalStorage 获取数据
 * @param key 存储键名
 * @param defaultValue 默认值 (获取失败或过期时返回)
 * @param autoDeleteExpired 是否自动删除已过期数据, 默认 true
 */
export function getStorage<T>(
  key: string,
  defaultValue: T | null = null,
  autoDeleteExpired = true
): T | null {
  const meta = getRawMeta<T>(key);

  if (meta === null) {
    return defaultValue;
  }

  if (isExpired(meta)) {
    if (autoDeleteExpired) {
      removeStorage(key);
      emitChange<T>({
        key,
        oldValue: meta.value,
        newValue: null,
        action: 'expired',
        timestamp: Date.now(),
      });
    }
    return defaultValue;
  }

  return meta.value;
}

/**
 * 获取存储项并返回完整元信息
 */
export function getStorageWithMeta<T>(
  key: string,
  autoDeleteExpired = true
): (StorageItemMeta<T> & { expired: boolean }) | null {
  const meta = getRawMeta<T>(key);

  if (meta === null) {
    return null;
  }

  const expired = isExpired(meta);
  if (expired && autoDeleteExpired) {
    removeStorage(key);
    emitChange<T>({
      key,
      oldValue: meta.value,
      newValue: null,
      action: 'expired',
      timestamp: Date.now(),
    });
  }

  return { ...meta, expired };
}

/**
 * 从 LocalStorage 删除数据
 * @param key 存储键名
 * @returns 是否删除成功
 */
export function removeStorage(key: string): boolean {
  if (!isLocalStorageAvailable()) {
    return false;
  }

  try {
    const oldMeta = getRawMeta(key);
    const oldValue = oldMeta ? oldMeta.value : null;

    window.localStorage.removeItem(key);

    emitChange({
      key,
      oldValue,
      newValue: null,
      action: 'remove',
      timestamp: Date.now(),
    });

    return true;
  } catch (error) {
    console.error(`[Storage] 删除失败 (key: ${key}):`, error);
    return false;
  }
}

/**
 * 清空所有以指定前缀开头的存储项
 * @param prefix 键名前缀, 不传则清空全部
 */
export function clearStorage(prefix?: string): number {
  if (!isLocalStorageAvailable()) {
    return 0;
  }

  let removedCount = 0;
  const keysToRemove: string[] = [];

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key === null) continue;
    if (!prefix || key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => {
    if (removeStorage(key)) {
      removedCount++;
    }
  });

  return removedCount;
}

/** ============================================
 *  批量操作方法
 * ============================================ */

/**
 * 批量存储数据
 */
export function batchSetStorage<T extends Record<string, unknown>>(
  items: T,
  options: StorageOptions = {}
): { success: number; failed: number } {
  let success = 0;
  let failed = 0;

  Object.entries(items).forEach(([key, value]) => {
    if (setStorage(key, value, options)) {
      success++;
    } else {
      failed++;
    }
  });

  return { success, failed };
}

/**
 * 批量获取数据
 */
export function batchGetStorage<T extends Record<string, unknown>>(
  keys: (keyof T)[],
  defaultValue: T[keyof T] | null = null
): Partial<T> {
  const result: Partial<T> = {};

  keys.forEach((key) => {
    const keyStr = String(key);
    const value = getStorage<T[keyof T]>(keyStr, defaultValue);
    if (value !== null) {
      result[key] = value;
    }
  });

  return result;
}

/**
 * 批量删除存储项
 */
export function batchRemoveStorage(keys: string[]): { success: number; failed: number } {
  let success = 0;
  let failed = 0;

  keys.forEach((key) => {
    if (removeStorage(key)) {
      success++;
    } else {
      failed++;
    }
  });

  return { success, failed };
}

/** ============================================
 *  存在性检查 & 元信息操作
 * ============================================ */

/**
 * 检查指定键是否存在 (且未过期)
 */
export function hasStorage(key: string, checkExpired = true): boolean {
  const meta = getRawMeta(key);
  if (meta === null) {
    return false;
  }
  if (checkExpired && isExpired(meta)) {
    return false;
  }
  return true;
}

/**
 * 获取指定存储项的剩余存活时间 (毫秒)
 * @returns 剩余时间 (毫秒), -1 表示永不过期, null 表示不存在或已过期
 */
export function getStorageTtl(key: string): number | null {
  const meta = getRawMeta(key);
  if (meta === null || isExpired(meta)) {
    return null;
  }
  if (meta.expiresAt === null) {
    return -1;
  }
  return meta.expiresAt - Date.now();
}

/**
 * 更新存储项的过期时间 (续期)
 * @param key 存储键名
 * @param ttl 新的过期时间 (毫秒, 从现在开始计算), null 表示永不过期
 */
export function refreshStorageTtl(key: string, ttl: number | null): boolean {
  const meta = getRawMeta(key);
  if (meta === null) {
    return false;
  }

  const newExpiresAt = ttl !== null ? Date.now() + ttl : null;
  const updatedMeta: StorageItemMeta<typeof meta.value> = {
    ...meta,
    expiresAt: newExpiresAt,
    updatedAt: Date.now(),
  };

  try {
    window.localStorage.setItem(key, JSON.stringify(updatedMeta));
    return true;
  } catch (error) {
    console.error(`[Storage] 更新过期时间失败 (key: ${key}):`, error);
    return false;
  }
}

/**
 * 获取存储项的版本号
 */
export function getStorageVersion(key: string): number | null {
  const meta = getRawMeta(key);
  return meta ? meta.version : null;
}

/**
 * 获取所有存储键名
 */
export function getAllStorageKeys(): string[] {
  if (!isLocalStorageAvailable()) {
    return [];
  }

  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key !== null) {
      keys.push(key);
    }
  }
  return keys;
}

/** ============================================
 *  事件监听方法
 * ============================================ */

/**
 * 监听指定键的存储变更事件
 * @param key 存储键名, 传 '*' 监听所有键
 * @param listener 变更监听器
 * @returns 取消监听的函数
 */
export function onStorageChange<T = unknown>(
  key: string,
  listener: StorageChangeListener<T>
): () => void {
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  const keyListeners = listeners.get(key)!;
  keyListeners.add(listener as StorageChangeListener);

  return () => {
    keyListeners.delete(listener as StorageChangeListener);
    if (keyListeners.size === 0) {
      listeners.delete(key);
    }
  };
}

/**
 * 监听原生 window storage 事件 (跨标签页同步)
 * @param handler 事件处理器
 * @returns 取消监听的函数
 */
export function onCrossTabStorageChange(
  handler: (event: StorageEvent) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('storage', handler);
  };
}

/** ============================================
 *  内存缓存 (MemoryStorage) - 用于 LocalStorage 不可用时的降级方案
 * ============================================ */

/**
 * 内存存储实现 - 作为 LocalStorage 的降级方案
 */
class MemoryStorage {
  private store = new Map<string, StorageItemMeta<unknown>>();

  set<T>(key: string, value: T, options: StorageOptions = {}): boolean {
    const opts: Required<StorageOptions> = { ...DEFAULT_OPTIONS, ...options };
    this.store.set(key, wrapWithMeta(value, opts));
    return true;
  }

  get<T>(key: string): T | null {
    const meta = this.store.get(key) as StorageItemMeta<T> | undefined;
    if (!meta) return null;
    if (isExpired(meta)) {
      this.store.delete(key);
      return null;
    }
    return meta.value;
  }

  remove(key: string): boolean {
    return this.store.delete(key);
  }

  clear(prefix?: string): number {
    if (!prefix) {
      const size = this.store.size;
      this.store.clear();
      return size;
    }
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  has(key: string): boolean {
    const meta = this.store.get(key);
    if (!meta) return false;
    if (isExpired(meta)) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }
}

/** 全局内存存储实例 */
export const memoryStorage = new MemoryStorage();

/** ============================================
 *  工具类封装 (面向对象风格)
 * ============================================ */

/**
 * 带命名空间的存储工具类
 */
export class NamespacedStorage {
  private namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace.endsWith(':') ? namespace : `${namespace}:`;
  }

  private fullKey(key: string): string {
    return `${this.namespace}${key}`;
  }

  set<T>(key: string, value: T, options?: StorageOptions): boolean {
    return setStorage(this.fullKey(key), value, options);
  }

  get<T>(key: string, defaultValue: T | null = null): T | null {
    return getStorage(this.fullKey(key), defaultValue);
  }

  remove(key: string): boolean {
    return removeStorage(this.fullKey(key));
  }

  has(key: string): boolean {
    return hasStorage(this.fullKey(key));
  }

  clear(): number {
    return clearStorage(this.namespace);
  }

  keys(): string[] {
    return getAllStorageKeys()
      .filter((k) => k.startsWith(this.namespace))
      .map((k) => k.slice(this.namespace.length));
  }

  onChange<T>(key: string, listener: StorageChangeListener<T>): () => void {
    return onStorageChange(this.fullKey(key), listener);
  }
}

/** ============================================
 *  存储诊断与清理
 * ============================================ */

/**
 * 存储统计信息
 */
export interface StorageStats {
  /** 总使用字节数 */
  usedBytes: number;
  /** 总条目数 */
  totalItems: number;
  /** 已过期条目数 */
  expiredItems: number;
  /** 预估可用配额 (部分浏览器不支持) */
  quotaBytes?: number;
  /** 各命名空间统计 */
  namespaces: Record<string, { count: number; bytes: number }>;
}

/**
 * 清理所有已过期的存储项
 * @returns 清理的条目数
 */
export function cleanupExpiredStorage(): number {
  const keys = getAllStorageKeys();
  let cleanedCount = 0;

  keys.forEach((key) => {
    const meta = getRawMeta(key);
    if (meta && isExpired(meta)) {
      if (removeStorage(key)) {
        cleanedCount++;
      }
    }
  });

  return cleanedCount;
}

/**
 * 获取存储统计信息
 */
export function getStorageStats(): StorageStats {
  const keys = getAllStorageKeys();
  let usedBytes = 0;
  let expiredItems = 0;
  const namespaces: StorageStats['namespaces'] = {};

  keys.forEach((key) => {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return;

    const bytes = new Blob([raw]).size;
    usedBytes += bytes;

    const meta = getRawMeta(key);
    if (meta && isExpired(meta)) {
      expiredItems++;
    }

    const colonIndex = key.indexOf(':');
    const ns = colonIndex > 0 ? key.slice(0, colonIndex) : '__root__';
    if (!namespaces[ns]) {
      namespaces[ns] = { count: 0, bytes: 0 };
    }
    namespaces[ns].count++;
    namespaces[ns].bytes += bytes;
  });

  const stats: StorageStats = {
    usedBytes,
    totalItems: keys.length,
    expiredItems,
    namespaces,
  };

  if ('storage' in navigator && 'estimate' in (navigator.storage as StorageManager)) {
    navigator.storage.estimate().then((estimate) => {
      if (estimate.quota) {
        stats.quotaBytes = estimate.quota;
      }
    }).catch(() => undefined);
  }

  return stats;
}
