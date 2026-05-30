import type { BridgeVersion, SimulationResult, ChangeLog } from '../types';

const STORAGE_KEYS = {
  VERSIONS: 'bridge_versions',
  RESULTS: 'simulation_results',
  CHANGE_LOGS: 'change_logs',
  CURRENT_USER: 'current_user',
};

export class StorageAdapter {
  private static instance: StorageAdapter;

  private constructor() {}

  static getInstance(): StorageAdapter {
    if (!StorageAdapter.instance) {
      StorageAdapter.instance = new StorageAdapter();
    }
    return StorageAdapter.instance;
  }

  private safeGet<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error(`Error reading ${key}:`, e);
      return defaultValue;
    }
  }

  private safeSet(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing ${key}:`, e);
    }
  }

  saveVersions(versions: BridgeVersion[]): void {
    this.safeSet(STORAGE_KEYS.VERSIONS, versions);
  }

  getVersions(): BridgeVersion[] {
    return this.safeGet<BridgeVersion[]>(STORAGE_KEYS.VERSIONS, []);
  }

  getVersionsByLevelId(levelId: string): BridgeVersion[] {
    const allVersions = this.getVersions();
    return allVersions
      .filter(v => v.levelId === levelId)
      .sort((a, b) => a.versionNumber - b.versionNumber);
  }

  getVersionById(versionId: string): BridgeVersion | undefined {
    const allVersions = this.getVersions();
    return allVersions.find(v => v.id === versionId);
  }

  saveVersion(version: BridgeVersion): void {
    const allVersions = this.getVersions();
    const existingIdx = allVersions.findIndex(v => v.id === version.id);
    
    if (existingIdx >= 0) {
      allVersions[existingIdx] = version;
    } else {
      allVersions.push(version);
    }
    
    this.saveVersions(allVersions);
  }

  deleteVersion(versionId: string): void {
    const allVersions = this.getVersions();
    const filtered = allVersions.filter(v => v.id !== versionId);
    this.saveVersions(filtered);
    
    this.deleteResultsByVersionId(versionId);
    this.deleteChangeLogsByVersionId(versionId);
  }

  getNextVersionNumber(levelId: string): number {
    const levelVersions = this.getVersionsByLevelId(levelId);
    return levelVersions.length > 0
      ? Math.max(...levelVersions.map(v => v.versionNumber)) + 1
      : 1;
  }

  saveResults(results: SimulationResult[]): void {
    this.safeSet(STORAGE_KEYS.RESULTS, results);
  }

  getResults(): SimulationResult[] {
    return this.safeGet<SimulationResult[]>(STORAGE_KEYS.RESULTS, []);
  }

  getAllResults(): SimulationResult[] {
    return this.getResults();
  }

  getResultsByVersionId(versionId: string): SimulationResult[] {
    const allResults = this.getResults();
    return allResults
      .filter(r => r.versionId === versionId)
      .sort((a, b) => a.loadStep - b.loadStep);
  }

  saveResult(result: SimulationResult): void {
    const allResults = this.getResults();
    const existingIdx = allResults.findIndex(
      r => r.versionId === result.versionId && r.loadStep === result.loadStep
    );
    
    if (existingIdx >= 0) {
      allResults[existingIdx] = result;
    } else {
      allResults.push(result);
    }
    
    this.saveResults(allResults);
  }

  deleteResultsByVersionId(versionId: string): void {
    const allResults = this.getResults();
    const filtered = allResults.filter(r => r.versionId !== versionId);
    this.saveResults(filtered);
  }

  saveChangeLogs(logs: ChangeLog[]): void {
    this.safeSet(STORAGE_KEYS.CHANGE_LOGS, logs);
  }

  getChangeLogs(): ChangeLog[] {
    return this.safeGet<ChangeLog[]>(STORAGE_KEYS.CHANGE_LOGS, []);
  }

  getChangeLogsByVersionId(versionId: string): ChangeLog[] {
    const allLogs = this.getChangeLogs();
    return allLogs
      .filter(l => l.versionId === versionId)
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  saveChangeLog(log: ChangeLog): void {
    const allLogs = this.getChangeLogs();
    const existingIdx = allLogs.findIndex(l => l.id === log.id);
    
    if (existingIdx >= 0) {
      allLogs[existingIdx] = log;
    } else {
      allLogs.push(log);
    }
    
    this.saveChangeLogs(allLogs);
  }

  deleteChangeLogsByVersionId(versionId: string): void {
    const allLogs = this.getChangeLogs();
    const filtered = allLogs.filter(l => l.versionId !== versionId);
    this.saveChangeLogs(filtered);
  }

  getCurrentUser(): string {
    return this.safeGet<string>(STORAGE_KEYS.CURRENT_USER, '教练');
  }

  setCurrentUser(user: string): void {
    this.safeSet(STORAGE_KEYS.CURRENT_USER, user);
  }

  generateId(prefix: string = ''): string {
    return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  clearAll(): void {
    localStorage.removeItem(STORAGE_KEYS.VERSIONS);
    localStorage.removeItem(STORAGE_KEYS.RESULTS);
    localStorage.removeItem(STORAGE_KEYS.CHANGE_LOGS);
  }

  exportAllData(): string {
    return JSON.stringify({
      versions: this.getVersions(),
      results: this.getResults(),
      changeLogs: this.getChangeLogs(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  importAllData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      
      if (data.versions) this.saveVersions(data.versions);
      if (data.results) this.saveResults(data.results);
      if (data.changeLogs) this.saveChangeLogs(data.changeLogs);
      
      return true;
    } catch (e) {
      console.error('Error importing data:', e);
      return false;
    }
  }
}

export const storageAdapter = StorageAdapter.getInstance();
