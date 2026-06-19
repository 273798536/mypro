const PREFIX = 'ts_gap_report_';

export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage set error:', e);
    }
  },

  remove(key: string): void {
    localStorage.removeItem(PREFIX + key);
  },

  clearAll(): void {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  },
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
};

export const hasInitialized = (): boolean => {
  return storage.get('initialized', false);
};

export const markInitialized = (): void => {
  storage.set('initialized', true);
};
