import { ExperimentResult } from '../types';

const STORAGE_KEY = 'physics_experiment_results';
const STORAGE_VERSION = '1.0';

interface StorageData {
  version: string;
  results: ExperimentResult[];
  lastUpdated: number;
}

function getStorageData(): StorageData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.version === STORAGE_VERSION) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read from localStorage:', e);
  }
  return {
    version: STORAGE_VERSION,
    results: [],
    lastUpdated: Date.now(),
  };
}

function setStorageData(data: StorageData): void {
  try {
    data.lastUpdated = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to write to localStorage:', e);
  }
}

export function getExperimentResults(): ExperimentResult[] {
  const data = getStorageData();
  return data.results;
}

export function saveExperimentResult(result: ExperimentResult): void {
  const data = getStorageData();
  data.results.unshift(result);
  if (data.results.length > 100) {
    data.results = data.results.slice(0, 100);
  }
  setStorageData(data);
}

export function deleteExperimentResult(id: string): void {
  const data = getStorageData();
  data.results = data.results.filter((r) => r.id !== id);
  setStorageData(data);
}

export function clearAllExperimentResults(): void {
  const data = getStorageData();
  data.results = [];
  setStorageData(data);
}

export function exportResultsToJSON(): string {
  const data = getStorageData();
  return JSON.stringify(data, null, 2);
}

export function importResultsFromJSON(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.version && Array.isArray(data.results)) {
      setStorageData(data);
      return true;
    }
    return false;
  } catch (e) {
    console.error('Failed to import JSON:', e);
    return false;
  }
}

export function generateExperimentId(): string {
  return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
