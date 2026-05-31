import { createPinia } from 'pinia'

export const pinia = createPinia()

const STORAGE_PREFIX = 'film_guarantee_'

export function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data))
  } catch (e) {
    console.error('存储失败:', e)
  }
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(STORAGE_PREFIX + key)
    return data ? JSON.parse(data) : defaultValue
  } catch (e) {
    console.error('读取失败:', e)
    return defaultValue
  }
}

export function clearStorage(key?: string): void {
  if (key) {
    localStorage.removeItem(STORAGE_PREFIX + key)
  } else {
    Object.keys(localStorage)
      .filter(k => k.startsWith(STORAGE_PREFIX))
      .forEach(k => localStorage.removeItem(k))
  }
}
