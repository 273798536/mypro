const STORAGE_PREFIX = "park_noise_";

export function saveToStorage<T>(key: string, value: T): void {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(STORAGE_PREFIX + key, serialized);
  } catch (e) {
    console.warn("Storage save failed:", key, e);
  }
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn("Storage load failed:", key, e);
    return defaultValue;
  }
}

export function clearStorage(key?: string): void {
  if (key) {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } else {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(STORAGE_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  }
}
