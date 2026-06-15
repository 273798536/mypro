import { Complaint } from './types';
import { STORAGE_KEY } from './constants';
import { validateAllComplaintsConsistency, fixConsistencyIssues } from './consistency';

export function saveToStorage(complaints: Complaint[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

export function loadFromStorage(): Complaint[] | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    
    const parsed = JSON.parse(data) as Complaint[];
    
    const validation = validateAllComplaintsConsistency(parsed);
    if (!validation.valid) {
      console.warn('Data consistency issues found:', validation.issues);
      return fixConsistencyIssues(parsed);
    }
    
    return parsed;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}

export function getStorageConsistencyIssues(): string[] {
  const data = loadFromStorage();
  if (!data) return [];
  const validation = validateAllComplaintsConsistency(data);
  return validation.issues;
}
