import type { Scheme } from '@/types';

const STORAGE_KEY = 'queue-theory-schemes';

export function loadSchemes(): Scheme[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSchemes(schemes: Scheme[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schemes));
  } catch (e) {
    console.error('Failed to save schemes:', e);
  }
}

export function addScheme(scheme: Scheme): Scheme[] {
  const schemes = loadSchemes();
  schemes.push(scheme);
  saveSchemes(schemes);
  return schemes;
}

export function updateScheme(id: string, updates: Partial<Scheme>): Scheme[] {
  const schemes = loadSchemes();
  const idx = schemes.findIndex((s) => s.id === id);
  if (idx >= 0) {
    schemes[idx] = { ...schemes[idx], ...updates, updatedAt: new Date().toISOString() };
    saveSchemes(schemes);
  }
  return schemes;
}

export function deleteScheme(id: string): Scheme[] {
  const schemes = loadSchemes().filter((s) => s.id !== id);
  saveSchemes(schemes);
  return schemes;
}

export function importSchemes(
  incoming: Scheme[],
  strategy: 'ignore' | 'overwrite' | 'append',
): Scheme[] {
  const existing = loadSchemes();
  const existingMap = new Map(existing.map((s) => [s.id, s]));
  let merged: Scheme[] = [];

  if (strategy === 'ignore') {
    merged = [...existing];
    for (const item of incoming) {
      if (!existingMap.has(item.id)) {
        merged.push(item);
      }
    }
  } else if (strategy === 'overwrite') {
    merged = [...incoming];
  } else if (strategy === 'append') {
    merged = [...existing];
    for (const item of incoming) {
      const newItem = {
        ...item,
        id: item.id + '_copy_' + Date.now(),
        name: item.name + ' (副本)',
      };
      merged.push(newItem);
    }
  }

  saveSchemes(merged);
  return merged;
}
