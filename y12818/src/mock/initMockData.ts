/**
 * Mock数据初始化模块
 * 负责将示例数据持久化到localStorage，并提供数据读写、重置等工具函数
 */

import { getCompleteMockData, type MockDataSet } from './sampleData';

/** localStorage存储键名枚举 */
export const STORAGE_KEYS = {
  /** 培养基批号数据 */
  MEDIA_BATCHES: 'mock_media_batches',
  /** 样本记录数据 */
  SAMPLE_RECORDS: 'mock_sample_records',
  /** 版本历史记录 */
  VERSION_RECORDS: 'mock_version_records',
  /** 人工修正记录 */
  CORRECTION_RECORDS: 'mock_correction_records',
  /** 结论记录 */
  CONCLUSION_RECORDS: 'mock_conclusion_records',
  /** 异常记录 */
  ANOMALY_RECORDS: 'mock_anomaly_records',
  /** 初始化标记（防止重复初始化） */
  INIT_FLAG: 'mock_data_initialized',
  /** 初始化时间戳 */
  INIT_TIMESTAMP: 'mock_data_init_timestamp'
} as const;

/** 存储键类型 */
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

/** 初始化配置选项 */
export interface InitOptions {
  /** 是否强制覆盖已有数据（默认false） */
  force?: boolean;
  /** 是否打印初始化日志（默认true） */
  verbose?: boolean;
  /** 初始化完成后的回调函数 */
  onComplete?: (stats: InitStats) => void;
}

/** 初始化统计信息 */
export interface InitStats {
  /** 培养基批号数量 */
  mediaBatches: number;
  /** 样本记录数量 */
  sampleRecords: number;
  /** 版本记录数量 */
  versionRecords: number;
  /** 修正记录数量 */
  correctionRecords: number;
  /** 结论记录数量 */
  conclusionRecords: number;
  /** 异常记录数量 */
  anomalyRecords: number;
  /** 初始化时间 */
  timestamp: string;
  /** 是否为强制重置 */
  isForceReset: boolean;
}

/**
 * 检查当前环境是否支持localStorage
 * @returns 是否支持
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__local_storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查Mock数据是否已初始化
 * @returns 是否已初始化
 */
export function isMockDataInitialized(): boolean {
  if (!isLocalStorageAvailable()) return false;
  return window.localStorage.getItem(STORAGE_KEYS.INIT_FLAG) === 'true';
}

/**
 * 写入数据到localStorage
 * @param key 存储键
 * @param data 数据对象
 * @returns 是否写入成功
 */
export function setStorageData<T>(key: StorageKey, data: T): boolean {
  try {
    const serialized = JSON.stringify(data);
    window.localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.error(`[MockInit] 写入localStorage失败 [${key}]:`, error);
    return false;
  }
}

/**
 * 从localStorage读取数据
 * @param key 存储键
 * @param defaultValue 默认值（读取失败时返回）
 * @returns 解析后的数据
 */
export function getStorageData<T>(key: StorageKey, defaultValue: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`[MockInit] 读取localStorage失败 [${key}]:`, error);
    return defaultValue;
  }
}

/**
 * 从localStorage移除指定数据
 * @param key 存储键
 */
export function removeStorageData(key: StorageKey): void {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error(`[MockInit] 移除localStorage失败 [${key}]:`, error);
  }
}

/**
 * 清空所有Mock相关数据（不影响其他业务数据）
 */
export function clearAllMockData(): void {
  const keys = Object.values(STORAGE_KEYS);
  for (const key of keys) {
    removeStorageData(key);
  }
  console.log('[MockInit] 已清空所有Mock数据');
}

/**
 * 获取当前已存储的Mock数据
 * @returns 完整的Mock数据集
 */
export function getStoredMockData(): MockDataSet {
  return {
    mediaBatches: getStorageData(STORAGE_KEYS.MEDIA_BATCHES, []),
    sampleRecords: getStorageData(STORAGE_KEYS.SAMPLE_RECORDS, []),
    versionRecords: getStorageData(STORAGE_KEYS.VERSION_RECORDS, []),
    correctionRecords: getStorageData(STORAGE_KEYS.CORRECTION_RECORDS, []),
    conclusionRecords: getStorageData(STORAGE_KEYS.CONCLUSION_RECORDS, []),
    anomalyRecords: getStorageData(STORAGE_KEYS.ANOMALY_RECORDS, [])
  };
}

/**
 * 初始化Mock数据到localStorage
 * 幂等操作：已初始化时不会重复写入，除非设置force=true
 * @param options 初始化选项
 * @returns 初始化统计信息
 */
export function initMockData(options: InitOptions = {}): InitStats {
  const { force = false, verbose = true, onComplete } = options;

  if (verbose) {
    console.log(`[MockInit] 开始初始化Mock数据${force ? '（强制模式）' : ''}...`);
  }

  // 检查localStorage可用性
  if (!isLocalStorageAvailable()) {
    const errorMsg = '[MockInit] 当前环境不支持localStorage，初始化失败';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // 检查是否已初始化（非强制模式）
  if (!force && isMockDataInitialized()) {
    if (verbose) {
      console.log('[MockInit] Mock数据已存在，跳过初始化。如需重置请使用 force=true');
    }
    const storedData = getStoredMockData();
    const stats: InitStats = {
      mediaBatches: storedData.mediaBatches.length,
      sampleRecords: storedData.sampleRecords.length,
      versionRecords: storedData.versionRecords.length,
      correctionRecords: storedData.correctionRecords.length,
      conclusionRecords: storedData.conclusionRecords.length,
      anomalyRecords: storedData.anomalyRecords.length,
      timestamp: window.localStorage.getItem(STORAGE_KEYS.INIT_TIMESTAMP) || new Date().toISOString(),
      isForceReset: false
    };
    onComplete?.(stats);
    return stats;
  }

  // 获取完整Mock数据
  const mockData = getCompleteMockData();
  const timestamp = new Date().toISOString();

  // 持久化各数据集
  const results = [
    setStorageData(STORAGE_KEYS.MEDIA_BATCHES, mockData.mediaBatches),
    setStorageData(STORAGE_KEYS.SAMPLE_RECORDS, mockData.sampleRecords),
    setStorageData(STORAGE_KEYS.VERSION_RECORDS, mockData.versionRecords),
    setStorageData(STORAGE_KEYS.CORRECTION_RECORDS, mockData.correctionRecords),
    setStorageData(STORAGE_KEYS.CONCLUSION_RECORDS, mockData.conclusionRecords),
    setStorageData(STORAGE_KEYS.ANOMALY_RECORDS, mockData.anomalyRecords)
  ];

  // 标记初始化状态
  setStorageData(STORAGE_KEYS.INIT_FLAG, 'true');
  setStorageData(STORAGE_KEYS.INIT_TIMESTAMP, timestamp);

  // 统计写入成功数量
  const successCount = results.filter(Boolean).length;
  const totalCount = results.length;

  const stats: InitStats = {
    mediaBatches: mockData.mediaBatches.length,
    sampleRecords: mockData.sampleRecords.length,
    versionRecords: mockData.versionRecords.length,
    correctionRecords: mockData.correctionRecords.length,
    conclusionRecords: mockData.conclusionRecords.length,
    anomalyRecords: mockData.anomalyRecords.length,
    timestamp,
    isForceReset: force
  };

  if (verbose) {
    console.log(`[MockInit] 初始化完成：成功写入 ${successCount}/${totalCount} 个数据集`);
    console.log('[MockInit] 数据统计：', {
      '培养基批号': stats.mediaBatches,
      '样本记录': stats.sampleRecords,
      '版本历史': stats.versionRecords,
      '人工修正': stats.correctionRecords,
      '结论记录': stats.conclusionRecords,
      '异常记录': stats.anomalyRecords,
      '初始化时间': new Date(timestamp).toLocaleString('zh-CN')
    });
    if (successCount < totalCount) {
      console.warn('[MockInit] 部分数据写入失败，请检查storage容量限制');
    }
  }

  onComplete?.(stats);
  return stats;
}

/**
 * 重置Mock数据（清空后重新初始化）
 * @param options 初始化选项
 * @returns 初始化统计信息
 */
export function resetMockData(options: Omit<InitOptions, 'force'> = {}): InitStats {
  clearAllMockData();
  return initMockData({ ...options, force: true });
}

/**
 * 获取Mock数据存储容量估算
 * @returns 容量信息（字节）
 */
export function getStorageSizeInfo(): {
  totalSize: number;
  sizeByKey: Record<string, number>;
  formattedTotal: string;
} {
  const sizeByKey: Record<string, number> = {};
  let totalSize = 0;

  for (const key of Object.values(STORAGE_KEYS)) {
    try {
      const value = window.localStorage.getItem(key);
      const size = value ? new Blob([value]).size : 0;
      sizeByKey[key] = size;
      totalSize += size;
    } catch {
      sizeByKey[key] = 0;
    }
  }

  // 格式化显示
  let formattedTotal: string;
  if (totalSize >= 1024 * 1024) {
    formattedTotal = `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;
  } else if (totalSize >= 1024) {
    formattedTotal = `${(totalSize / 1024).toFixed(2)} KB`;
  } else {
    formattedTotal = `${totalSize} B`;
  }

  return { totalSize, sizeByKey, formattedTotal };
}
