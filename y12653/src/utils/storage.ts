const PREFIX = 'reactor_inspect_';

export function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveLS<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Silently fail - storage not available
  }
}

export function clearLS(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // Silently fail - storage not available
  }
}
