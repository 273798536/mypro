import type { TacticsScheme, SimulationResult } from '../engine/types';

const SCHEMES_KEY = 'robot_soccer_schemes';
const RESULTS_KEY = 'robot_soccer_results';

export function saveScheme(scheme: TacticsScheme): void {
  const schemes = loadSchemes();
  const existingIndex = schemes.findIndex((s) => s.id === scheme.id);
  if (existingIndex >= 0) {
    schemes[existingIndex] = { ...scheme, updatedAt: Date.now() };
  } else {
    schemes.push({ ...scheme, createdAt: Date.now(), updatedAt: Date.now() });
  }
  localStorage.setItem(SCHEMES_KEY, JSON.stringify(schemes));
}

export function loadSchemes(): TacticsScheme[] {
  try {
    const data = localStorage.getItem(SCHEMES_KEY);
    if (!data) return [];
    return JSON.parse(data) as TacticsScheme[];
  } catch {
    return [];
  }
}

export function loadScheme(id: string): TacticsScheme | undefined {
  const schemes = loadSchemes();
  return schemes.find((s) => s.id === id);
}

export function deleteScheme(id: string): void {
  const schemes = loadSchemes();
  const filtered = schemes.filter((s) => s.id !== id);
  localStorage.setItem(SCHEMES_KEY, JSON.stringify(filtered));
}

export function saveSimulationResult(result: SimulationResult): void {
  const results = loadSimulationResults();
  results.push(result);
  if (results.length > 50) {
    results.shift();
  }
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
}

export function loadSimulationResults(): SimulationResult[] {
  try {
    const data = localStorage.getItem(RESULTS_KEY);
    if (!data) return [];
    return JSON.parse(data) as SimulationResult[];
  } catch {
    return [];
  }
}

export function loadSimulationResult(
  schemeId: string
): SimulationResult | undefined {
  const results = loadSimulationResults();
  return results.find((r) => r.schemeId === schemeId);
}

export function clearAllData(): void {
  localStorage.removeItem(SCHEMES_KEY);
  localStorage.removeItem(RESULTS_KEY);
}
