const STORAGE_PREFIX = 'airline_liability_';

export function setStorage<T>(key: string, value: T): void {
  try {
    const fullKey = STORAGE_PREFIX + key;
    localStorage.setItem(fullKey, JSON.stringify(value));
  } catch (e) {
    console.error('Storage set error:', e);
  }
}

export function getStorage<T>(key: string, defaultValue?: T): T | null {
  try {
    const fullKey = STORAGE_PREFIX + key;
    const value = localStorage.getItem(fullKey);
    if (value === null) return defaultValue ?? null;
    return JSON.parse(value) as T;
  } catch (e) {
    console.error('Storage get error:', e);
    return defaultValue ?? null;
  }
}

export function removeStorage(key: string): void {
  try {
    const fullKey = STORAGE_PREFIX + key;
    localStorage.removeItem(fullKey);
  } catch (e) {
    console.error('Storage remove error:', e);
  }
}

export function backupData<T>(backupKey: string, data: T): void {
  const timestamp = Date.now();
  const backupInfo = {
    timestamp,
    data,
  };
  setStorage(`backup_${backupKey}`, backupInfo);
}

export function restoreBackup<T>(backupKey: string): T | null {
  const backupInfo = getStorage<{ timestamp: number; data: T }>(`backup_${backupKey}`);
  if (!backupInfo) return null;
  return backupInfo.data;
}

export function listBackups(): Array<{ key: string; timestamp: number }> {
  const backups: Array<{ key: string; timestamp: number }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const fullKey = localStorage.key(i);
    if (fullKey?.startsWith(STORAGE_PREFIX + 'backup_')) {
      const key = fullKey.replace(STORAGE_PREFIX + 'backup_', '');
      const value = getStorage<{ timestamp: number }>(`backup_${key}`);
      if (value) {
        backups.push({ key, timestamp: value.timestamp });
      }
    }
  }
  return backups.sort((a, b) => b.timestamp - a.timestamp);
}
