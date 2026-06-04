import type { BatchRecord, Screenshot } from '@/types';

const BATCH_STORAGE_KEY = 'safety-risk-map-batch';
const SCREENSHOT_STORAGE_PREFIX = 'safety-risk-map-screenshot-';

export function saveBatchRecord(batch: BatchRecord): void {
  try {
    localStorage.setItem(BATCH_STORAGE_KEY, JSON.stringify(batch));
  } catch (e) {
    console.error('Failed to save batch record:', e);
  }
}

export function loadBatchRecord(): BatchRecord | null {
  try {
    const data = localStorage.getItem(BATCH_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Failed to load batch record:', e);
    return null;
  }
}

export function saveScreenshot(screenshot: Screenshot): void {
  try {
    localStorage.setItem(
      SCREENSHOT_STORAGE_PREFIX + screenshot.id,
      JSON.stringify(screenshot)
    );
  } catch (e) {
    console.error('Failed to save screenshot:', e);
  }
}

export function loadScreenshot(id: string): Screenshot | null {
  try {
    const data = localStorage.getItem(SCREENSHOT_STORAGE_PREFIX + id);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Failed to load screenshot:', e);
    return null;
  }
}

export function clearAllData(): void {
  try {
    localStorage.removeItem(BATCH_STORAGE_KEY);
    Object.keys(localStorage)
      .filter((key) => key.startsWith(SCREENSHOT_STORAGE_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch (e) {
    console.error('Failed to clear data:', e);
  }
}
