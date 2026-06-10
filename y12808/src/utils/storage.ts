export function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('保存到 localStorage 失败:', e);
  }
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    if (data === null) {
      return defaultValue;
    }
    return JSON.parse(data) as T;
  } catch (e) {
    console.error('从 localStorage 读取失败:', e);
    return defaultValue;
  }
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error('从 localStorage 删除失败:', e);
  }
}

export const STORAGE_KEYS = {
  SAMPLES: 'ct_samples',
  CULTURE_RECORDS: 'ct_culture_records',
  CONCLUSIONS: 'ct_conclusions',
  SOURCE_TRACES: 'ct_source_traces',
  IMPORT_BATCHES: 'ct_import_batches',
  CORRECTION_RECORDS: 'ct_correction_records',
  USER_ROLE: 'ct_user_role'
};
