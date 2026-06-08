const SANDBOXES_KEY = 'orbit_sandboxes';
const HISTORY_KEY = 'orbit_history';
const CURRENT_USER_KEY = 'orbit_current_user';

export function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function setToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage write error:', e);
  }
}

export const storage = {
  getSandboxes: <T>() => getFromStorage<T>(SANDBOXES_KEY, [] as unknown as T),
  setSandboxes: <T>(value: T) => setToStorage(SANDBOXES_KEY, value),
  getHistory: <T>() => getFromStorage<T>(HISTORY_KEY, [] as unknown as T),
  setHistory: <T>(value: T) => setToStorage(HISTORY_KEY, value),
  getCurrentUser: () => getFromStorage<string>(CURRENT_USER_KEY, '舞台统筹员'),
  setCurrentUser: (name: string) => setToStorage(CURRENT_USER_KEY, name),
};
