export const STORAGE_KEYS = {
  SERIES: 'dramacalc_series',
  COST: 'dramacalc_cost',
  FLOW: 'dramacalc_flow',
  PAYMENT: 'dramacalc_payment',
  CALCULATION: 'dramacalc_calculation',
  CHANGE_LOG: 'dramacalc_change_log',
  EXCEPTION: 'dramacalc_exception',
  SETTINGS: 'dramacalc_settings',
  INITIALIZED: 'dramacalc_initialized',
} as const;

export function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
  }
}

export function clearAllStorage(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    if (key !== STORAGE_KEYS.INITIALIZED) {
      removeFromStorage(key);
    }
  });
  removeFromStorage(STORAGE_KEYS.INITIALIZED);
}

export function isInitialized(): boolean {
  return getFromStorage(STORAGE_KEYS.INITIALIZED, false);
}

export function markInitialized(): void {
  saveToStorage(STORAGE_KEYS.INITIALIZED, true);
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}
