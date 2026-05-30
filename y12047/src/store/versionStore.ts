import { create } from 'zustand';
import type { BridgeVersion, SimulationResult } from '../types';
import { storageAdapter } from '../data/storageAdapter';
import { compareVersions, generateChangeLogs } from '../utils/diff';
import type { VersionDiff, ChangeLog } from '../types';

interface VersionState {
  versions: BridgeVersion[];
  currentVersionId: string | null;
  compareVersionId: string | null;
  versionDiff: VersionDiff | null;
  changeLogs: ChangeLog[];
  resultsMap: Record<string, SimulationResult[]>;
  selectedLevelId: string | null;

  setSelectedLevelId: (levelId: string | null) => void;
  loadVersionsByLevel: (levelId: string) => void;
  setCurrentVersionId: (versionId: string | null) => void;
  setCompareVersionId: (versionId: string | null) => void;

  compareVersions: (versionId1: string, versionId2: string) => void;
  clearComparison: () => void;

  loadVersionResults: (versionId: string) => SimulationResult[];
  getFinalResultForVersion: (versionId: string) => SimulationResult | null;

  getVersionTree: (levelId: string) => BridgeVersion[];
  getVersionChain: (versionId: string) => BridgeVersion[];

  deleteVersion: (versionId: string) => void;
  duplicateVersion: (versionId: string, levelId: string) => BridgeVersion | null;

  exportVersionData: (versionId: string) => string;

  reset: () => void;
}

export const useVersionStore = create<VersionState>((set, get) => ({
  versions: [],
  currentVersionId: null,
  compareVersionId: null,
  versionDiff: null,
  changeLogs: [],
  resultsMap: {},
  selectedLevelId: null,

  setSelectedLevelId: (levelId) => set({ selectedLevelId: levelId }),

  loadVersionsByLevel: (levelId) => {
    const versions = storageAdapter.getVersionsByLevelId(levelId);
    const resultsMap: Record<string, SimulationResult[]> = {};
    
    for (const version of versions) {
      resultsMap[version.id] = storageAdapter.getResultsByVersionId(version.id);
    }

    set({
      versions,
      selectedLevelId: levelId,
      resultsMap,
    });
  },

  setCurrentVersionId: (versionId) => set({ currentVersionId: versionId }),
  setCompareVersionId: (versionId) => set({ compareVersionId: versionId }),

  compareVersions: (versionId1, versionId2) => {
    const v1 = storageAdapter.getVersionById(versionId1);
    const v2 = storageAdapter.getVersionById(versionId2);
    
    if (v1 && v2) {
      const diff = compareVersions(v1, v2);
      const logs = generateChangeLogs(v1, v2);
      set({
        versionDiff: diff,
        changeLogs: logs,
        currentVersionId: versionId1,
        compareVersionId: versionId2,
      });
    }
  },

  clearComparison: () =>
    set({
      compareVersionId: null,
      versionDiff: null,
      changeLogs: [],
    }),

  loadVersionResults: (versionId) => {
    const results = storageAdapter.getResultsByVersionId(versionId);
    set((state) => ({
      resultsMap: { ...state.resultsMap, [versionId]: results },
    }));
    return results;
  },

  getFinalResultForVersion: (versionId) => {
    const { resultsMap } = get();
    const results = resultsMap[versionId];
    if (!results || results.length === 0) return null;
    return results[results.length - 1];
  },

  getVersionTree: (levelId) => {
    const versions = storageAdapter.getVersionsByLevelId(levelId);
    return versions.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  },

  getVersionChain: (versionId) => {
    const chain: BridgeVersion[] = [];
    let currentId: string | null = versionId;

    while (currentId) {
      const version = storageAdapter.getVersionById(currentId);
      if (version) {
        chain.unshift(version);
        currentId = version.parentVersionId;
      } else {
        break;
      }
    }

    return chain;
  },

  deleteVersion: (versionId) => {
    storageAdapter.deleteVersion(versionId);
    storageAdapter.deleteResultsByVersionId(versionId);
    
    const { selectedLevelId, currentVersionId } = get();
    const versions = storageAdapter.getVersionsByLevelId(selectedLevelId || '');
    
    set((state) => {
      const newResultsMap = { ...state.resultsMap };
      delete newResultsMap[versionId];
      
      return {
        versions,
        resultsMap: newResultsMap,
        currentVersionId: currentVersionId === versionId ? null : currentVersionId,
      };
    });
  },

  duplicateVersion: (versionId, levelId) => {
    const original = storageAdapter.getVersionById(versionId);
    if (!original) return null;

    const newVersion: BridgeVersion = {
      ...original,
      id: storageAdapter.generateId('v-'),
      versionNumber: storageAdapter.getNextVersionNumber(levelId),
      name: `${original.name.split(' V')[0]} V${storageAdapter.getNextVersionNumber(levelId)} (副本)`,
      createdAt: new Date().toISOString(),
      createdBy: storageAdapter.getCurrentUser(),
      nodes: JSON.parse(JSON.stringify(original.nodes)),
      members: JSON.parse(JSON.stringify(original.members)),
    };

    storageAdapter.saveVersion(newVersion);

    const originalResults = storageAdapter.getResultsByVersionId(versionId);
    for (const result of originalResults) {
      const newResult: SimulationResult = {
        ...result,
        id: storageAdapter.generateId('r-'),
        versionId: newVersion.id,
      };
      storageAdapter.saveResult(newResult);
    }

    const versions = storageAdapter.getVersionsByLevelId(levelId);
    set({ versions });

    return newVersion;
  },

  exportVersionData: (versionId) => {
    const version = storageAdapter.getVersionById(versionId);
    if (!version) return '';

    const results = storageAdapter.getResultsByVersionId(versionId);
    
    const exportData = {
      version,
      results,
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  },

  reset: () => {
    set({
      versions: [],
      currentVersionId: null,
      compareVersionId: null,
      versionDiff: null,
      changeLogs: [],
      resultsMap: {},
      selectedLevelId: null,
    });
  },
}));
