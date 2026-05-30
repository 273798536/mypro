import type { SavedView, FilterState } from '../types';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createSavedView(
  name: string,
  cameraPosition: [number, number, number],
  cameraTarget: [number, number, number],
  filters: FilterState
): SavedView {
  return {
    id: generateId(),
    name,
    cameraPosition: [...cameraPosition] as [number, number, number],
    cameraTarget: [...cameraTarget] as [number, number, number],
    filters: JSON.parse(JSON.stringify(filters)),
    createdAt: new Date().toISOString()
  };
}

export function saveViewsToStorage(views: SavedView[]): void {
  try {
    localStorage.setItem('guqin-views', JSON.stringify(views));
  } catch (e) {
    console.error('Failed to save views to localStorage', e);
  }
}

export function loadViewsFromStorage(): SavedView[] {
  try {
    const data = localStorage.getItem('guqin-views');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load views from localStorage', e);
    return [];
  }
}

export function saveConclusionsToStorage(conclusions: any[]): void {
  try {
    localStorage.setItem('guqin-conclusions', JSON.stringify(conclusions));
  } catch (e) {
    console.error('Failed to save conclusions to localStorage', e);
  }
}

export function loadConclusionsFromStorage(): any[] {
  try {
    const data = localStorage.getItem('guqin-conclusions');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load conclusions from localStorage', e);
    return [];
  }
}

export function cameraPositionEquals(
  a: [number, number, number],
  b: [number, number, number],
  tolerance: number = 0.1
): boolean {
  return (
    Math.abs(a[0] - b[0]) < tolerance &&
    Math.abs(a[1] - b[1]) < tolerance &&
    Math.abs(a[2] - b[2]) < tolerance
  );
}
