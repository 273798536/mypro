import type { VersionSnapshot } from '../types';

const STORAGE_KEY = 'markov_churn_versions';

export function saveVersion(snapshot: VersionSnapshot): void {
  try {
    const versions = getVersions();
    versions.unshift(snapshot);
    if (versions.length > 20) {
      versions.length = 20;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(versions));
  } catch (error) {
    console.error('Failed to save version:', error);
  }
}

export function getVersions(): VersionSnapshot[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get versions:', error);
    return [];
  }
}

export function getVersionById(id: string): VersionSnapshot | null {
  const versions = getVersions();
  return versions.find(v => v.id === id) || null;
}

export function deleteVersion(id: string): void {
  try {
    const versions = getVersions().filter(v => v.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(versions));
  } catch (error) {
    console.error('Failed to delete version:', error);
  }
}

export function clearVersions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear versions:', error);
  }
}

export function generateVersionId(): string {
  return `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
