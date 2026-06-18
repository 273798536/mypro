const PREFIX = 'idcr_';

const safeParse = <T>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const LocalStorageProvider = {
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(PREFIX + key);
    return safeParse<T>(raw);
  },

  set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  },

  mergeTo<T extends Record<string, unknown>>(key: string, value: Partial<T>): void {
    if (typeof window === 'undefined') return;
    const existing = safeParse<T>(window.localStorage.getItem(PREFIX + key));
    const merged: T = existing
      ? ({ ...existing, ...value } as T)
      : (value as T);
    window.localStorage.setItem(PREFIX + key, JSON.stringify(merged));
  },

  list<T extends { id: string }>(key: string): T[] {
    return LocalStorageProvider.get<T[]>(key) ?? [];
  },

  appendToList<T extends { id: string }>(listKey: string, item: T): void {
    const existing = LocalStorageProvider.list<T>(listKey);
    const next = [...existing, item];
    LocalStorageProvider.set(listKey, next);
  },

  updateInList<T extends { id: string }>(
    listKey: string,
    id: string,
    updater: (item: T) => T
  ): void {
    const existing = LocalStorageProvider.list<T>(listKey);
    const next = existing.map((x) => (x.id === id ? updater(x) : x));
    LocalStorageProvider.set(listKey, next);
  },
};
