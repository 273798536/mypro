import type { Viewpoint, DetectionResult, ChangeRecord, VectorFieldFormula, SeedPoint, ColorScale } from '@/types';

const STORAGE_KEYS = {
  VIEWPOINTS: 'vector_field_viewpoints',
  RESULTS: 'vector_field_results',
  HISTORY: 'vector_field_history',
  FORMULAS: 'vector_field_formulas',
  SEED_POINTS: 'vector_field_seeds',
  COLOR_SCALE: 'vector_field_color_scale',
} as const;

export function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to storage:', error);
  }
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error('Failed to load from storage:', error);
    return defaultValue;
  }
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove from storage:', error);
  }
}

export function saveViewpoints(viewpoints: Viewpoint[]): void {
  saveToStorage(STORAGE_KEYS.VIEWPOINTS, viewpoints);
}

export function loadViewpoints(): Viewpoint[] {
  return loadFromStorage<Viewpoint[]>(STORAGE_KEYS.VIEWPOINTS, []);
}

export function saveResults(results: DetectionResult[]): void {
  saveToStorage(STORAGE_KEYS.RESULTS, results);
}

export function loadResults(): DetectionResult[] {
  return loadFromStorage<DetectionResult[]>(STORAGE_KEYS.RESULTS, []);
}

export function saveChangeHistory(history: ChangeRecord[]): void {
  saveToStorage(STORAGE_KEYS.HISTORY, history);
}

export function loadChangeHistory(): ChangeRecord[] {
  return loadFromStorage<ChangeRecord[]>(STORAGE_KEYS.HISTORY, []);
}

export function saveCustomFormulas(formulas: VectorFieldFormula[]): void {
  saveToStorage(STORAGE_KEYS.FORMULAS, formulas);
}

export function loadCustomFormulas(): VectorFieldFormula[] {
  return loadFromStorage<VectorFieldFormula[]>(STORAGE_KEYS.FORMULAS, []);
}

export function saveSeedPoints(points: SeedPoint[]): void {
  saveToStorage(STORAGE_KEYS.SEED_POINTS, points);
}

export function loadSeedPoints(): SeedPoint[] {
  return loadFromStorage<SeedPoint[]>(STORAGE_KEYS.SEED_POINTS, []);
}

export function saveColorScale(scale: ColorScale): void {
  saveToStorage(STORAGE_KEYS.COLOR_SCALE, scale);
}

export function loadColorScale(): ColorScale | null {
  return loadFromStorage<ColorScale | null>(STORAGE_KEYS.COLOR_SCALE, null);
}

export function exportToJson<T>(data: T, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importFromJson<T>(): Promise<T | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            resolve(data as T);
          } catch (error) {
            console.error('Failed to parse JSON:', error);
            resolve(null);
          }
        };
        reader.readAsText(file);
      } else {
        resolve(null);
      }
    };
    input.click();
  });
}
