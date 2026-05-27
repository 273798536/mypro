const STORAGE_PREFIX = 'ski_risk_map_';

export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key);
      if (item === null) return defaultValue;
      return JSON.parse(item) as T;
    } catch {
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage set error:', e);
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
    } catch (e) {
      console.error('Storage remove error:', e);
    }
  },

  clear(): void {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(STORAGE_PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.error('Storage clear error:', e);
    }
  },
};

export const saveToLocalStorage = <T>(key: string, data: T): void => {
  storage.set(key, data);
};

export const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  return storage.get(key, defaultValue);
};
