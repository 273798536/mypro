import { ExperimentRecord, CalculationResult, OperationLog, SuspendRecord } from '@/types/experiment';

const STORAGE_KEYS = {
  EXPERIMENTS: 'wt_experiments',
  RESULTS: 'wt_results',
  LOGS: 'wt_operation_logs',
  SUSPENDS: 'wt_suspend_records',
  CURRENT_USER: 'wt_current_user',
  FIELD_MAPPING_PRESETS: 'wt_field_mapping_presets',
};

const safeParse = <T>(data: string | null, defaultValue: T): T => {
  if (!data) return defaultValue;
  try {
    return JSON.parse(data) as T;
  } catch {
    return defaultValue;
  }
};

export const saveToStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('存储失败:', error);
  }
};

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const data = localStorage.getItem(key);
    return safeParse<T>(data, defaultValue);
  } catch (error) {
    console.error('读取失败:', error);
    return defaultValue;
  }
};

export const saveExperiments = (experiments: ExperimentRecord[]): void => {
  saveToStorage(STORAGE_KEYS.EXPERIMENTS, experiments);
};

export const loadExperiments = (): ExperimentRecord[] => {
  return loadFromStorage<ExperimentRecord[]>(STORAGE_KEYS.EXPERIMENTS, []);
};

export const saveResults = (results: CalculationResult[]): void => {
  saveToStorage(STORAGE_KEYS.RESULTS, results);
};

export const loadResults = (): CalculationResult[] => {
  return loadFromStorage<CalculationResult[]>(STORAGE_KEYS.RESULTS, []);
};

export const saveOperationLogs = (logs: OperationLog[]): void => {
  saveToStorage(STORAGE_KEYS.LOGS, logs);
};

export const loadOperationLogs = (): OperationLog[] => {
  return loadFromStorage<OperationLog[]>(STORAGE_KEYS.LOGS, []);
};

export const saveSuspendRecords = (records: SuspendRecord[]): void => {
  saveToStorage(STORAGE_KEYS.SUSPENDS, records);
};

export const loadSuspendRecords = (): SuspendRecord[] => {
  return loadFromStorage<SuspendRecord[]>(STORAGE_KEYS.SUSPENDS, []);
};

export const getCurrentUser = (): string => {
  return loadFromStorage<string>(STORAGE_KEYS.CURRENT_USER, '维修师傅');
};

export const setCurrentUser = (user: string): void => {
  saveToStorage(STORAGE_KEYS.CURRENT_USER, user);
};

export const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const exportAllData = (): string => {
  const data = {
    experiments: loadExperiments(),
    results: loadResults(),
    logs: loadOperationLogs(),
    suspends: loadSuspendRecords(),
    exportTime: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
};

export const importAllData = (jsonData: string): boolean => {
  try {
    const data = JSON.parse(jsonData);
    if (data.experiments) saveExperiments(data.experiments);
    if (data.results) saveResults(data.results);
    if (data.logs) saveOperationLogs(data.logs);
    if (data.suspends) saveSuspendRecords(data.suspends);
    return true;
  } catch (error) {
    console.error('导入失败:', error);
    return false;
  }
};

export const clearAllData = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};
