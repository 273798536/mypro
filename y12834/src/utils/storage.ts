import type {
  FeedingRecord,
  Sample,
  SampleVersion,
  ImageAnnotation,
  PathologyNote,
  CorrectionLog,
  WorkflowRun,
  Anomaly,
  SpeciesSynonymCheck,
  AppSettings,
} from '../types';

/**
 * LocalStorage 存储键名常量集合
 * 统一管理所有持久化数据的键名，避免重复和拼写错误
 */
export const STORAGE_KEYS = {
  /** 投喂记录列表 */
  FEEDING_RECORDS: 'feeding_records',
  /** 样本列表 */
  SAMPLES: 'samples',
  /** 样本版本列表 */
  SAMPLE_VERSIONS: 'sample_versions',
  /** 图片标注列表 */
  IMAGE_ANNOTATIONS: 'image_annotations',
  /** 病理备注列表 */
  PATHOLOGY_NOTES: 'pathology_notes',
  /** 修正日志列表 */
  CORRECTION_LOGS: 'correction_logs',
  /** 工作流运行列表 */
  WORKFLOW_RUNS: 'workflow_runs',
  /** 异常列表 */
  ANOMALIES: 'anomalies',
  /** 物种名同义校验列表 */
  SPECIES_SYNONYM_CHECKS: 'species_synonym_checks',
  /** 应用设置 */
  APP_SETTINGS: 'app_settings',
  /** 数据是否已初始化标记 */
  DATA_INITIALIZED: 'data_initialized',
} as const;

/**
 * 存储键名类型
 */
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * 从 LocalStorage 读取数据
 * 如果键不存在或解析失败，返回默认值
 *
 * @template T - 预期返回的数据类型
 * @param key - 存储键名
 * @param defaultValue - 读取失败时返回的默认值
 * @returns 解析后的数据或默认值
 */
export function getFromStorage<T>(key: StorageKey, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return defaultValue;
    }
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`[storage] 读取 ${key} 失败:`, error);
    return defaultValue;
  }
}

/**
 * 将数据保存到 LocalStorage
 * 数据会经过 JSON.stringify 序列化
 *
 * @template T - 要保存的数据类型
 * @param key - 存储键名
 * @param value - 要保存的数据
 */
export function setToStorage<T>(key: StorageKey, value: T): void {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
  } catch (error) {
    console.error(`[storage] 保存 ${key} 失败:`, error);
  }
}

/**
 * 从 LocalStorage 删除指定键的数据
 *
 * @param key - 要删除的存储键名
 */
export function removeFromStorage(key: StorageKey): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`[storage] 删除 ${key} 失败:`, error);
  }
}

/**
 * 便捷函数：获取所有投喂记录
 */
export function getFeedingRecords(): FeedingRecord[] {
  return getFromStorage<FeedingRecord[]>(STORAGE_KEYS.FEEDING_RECORDS, []);
}

/**
 * 便捷函数：保存所有投喂记录
 */
export function setFeedingRecords(records: FeedingRecord[]): void {
  setToStorage(STORAGE_KEYS.FEEDING_RECORDS, records);
}

/**
 * 便捷函数：获取所有样本
 */
export function getSamples(): Sample[] {
  return getFromStorage<Sample[]>(STORAGE_KEYS.SAMPLES, []);
}

/**
 * 便捷函数：保存所有样本
 */
export function setSamples(samples: Sample[]): void {
  setToStorage(STORAGE_KEYS.SAMPLES, samples);
}

/**
 * 便捷函数：获取所有样本版本
 */
export function getSampleVersions(): SampleVersion[] {
  return getFromStorage<SampleVersion[]>(STORAGE_KEYS.SAMPLE_VERSIONS, []);
}

/**
 * 便捷函数：保存所有样本版本
 */
export function setSampleVersions(versions: SampleVersion[]): void {
  setToStorage(STORAGE_KEYS.SAMPLE_VERSIONS, versions);
}

/**
 * 便捷函数：获取所有图片标注
 */
export function getImageAnnotations(): ImageAnnotation[] {
  return getFromStorage<ImageAnnotation[]>(STORAGE_KEYS.IMAGE_ANNOTATIONS, []);
}

/**
 * 便捷函数：保存所有图片标注
 */
export function setImageAnnotations(annotations: ImageAnnotation[]): void {
  setToStorage(STORAGE_KEYS.IMAGE_ANNOTATIONS, annotations);
}

/**
 * 便捷函数：获取所有病理备注
 */
export function getPathologyNotes(): PathologyNote[] {
  return getFromStorage<PathologyNote[]>(STORAGE_KEYS.PATHOLOGY_NOTES, []);
}

/**
 * 便捷函数：保存所有病理备注
 */
export function setPathologyNotes(notes: PathologyNote[]): void {
  setToStorage(STORAGE_KEYS.PATHOLOGY_NOTES, notes);
}

/**
 * 便捷函数：获取所有修正日志
 */
export function getCorrectionLogs(): CorrectionLog[] {
  return getFromStorage<CorrectionLog[]>(STORAGE_KEYS.CORRECTION_LOGS, []);
}

/**
 * 便捷函数：保存所有修正日志
 */
export function setCorrectionLogs(logs: CorrectionLog[]): void {
  setToStorage(STORAGE_KEYS.CORRECTION_LOGS, logs);
}

/**
 * 便捷函数：获取所有工作流运行
 */
export function getWorkflowRuns(): WorkflowRun[] {
  return getFromStorage<WorkflowRun[]>(STORAGE_KEYS.WORKFLOW_RUNS, []);
}

/**
 * 便捷函数：保存所有工作流运行
 */
export function setWorkflowRuns(runs: WorkflowRun[]): void {
  setToStorage(STORAGE_KEYS.WORKFLOW_RUNS, runs);
}

/**
 * 便捷函数：获取所有异常
 */
export function getAnomalies(): Anomaly[] {
  return getFromStorage<Anomaly[]>(STORAGE_KEYS.ANOMALIES, []);
}

/**
 * 便捷函数：保存所有异常
 */
export function setAnomalies(anomalies: Anomaly[]): void {
  setToStorage(STORAGE_KEYS.ANOMALIES, anomalies);
}

/**
 * 便捷函数：获取所有物种名同义校验记录
 */
export function getSpeciesSynonymChecks(): SpeciesSynonymCheck[] {
  return getFromStorage<SpeciesSynonymCheck[]>(STORAGE_KEYS.SPECIES_SYNONYM_CHECKS, []);
}

/**
 * 便捷函数：保存所有物种名同义校验记录
 */
export function setSpeciesSynonymChecks(checks: SpeciesSynonymCheck[]): void {
  setToStorage(STORAGE_KEYS.SPECIES_SYNONYM_CHECKS, checks);
}

/**
 * 便捷函数：获取应用设置
 */
export function getAppSettings(): AppSettings {
  return getFromStorage<AppSettings>(STORAGE_KEYS.APP_SETTINGS, {
    current_role: 'researcher',
    selected_run_id: null,
  });
}

/**
 * 便捷函数：保存应用设置
 */
export function setAppSettings(settings: AppSettings): void {
  setToStorage(STORAGE_KEYS.APP_SETTINGS, settings);
}
