const STORAGE_KEY = 'wind-window-app-data';

export interface StoredData {
  buoyData: any[];
  correctionRecords: any[];
  inspectionPhotos: any[];
  windWindowResults: any[];
  isFirstVisit: boolean;
  lastUpdated: string;
}

export function loadFromStorage(): StoredData | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (e) {
    console.error('Failed to load from storage:', e);
    return null;
  }
}

export function saveToStorage(data: StoredData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to storage:', e);
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear storage:', e);
  }
}

export function isFirstVisit(): boolean {
  const data = loadFromStorage();
  return data === null || data.isFirstVisit !== false;
}
