import { create } from 'zustand';
import type { DataVersion } from '@/types';
import { dataVersions } from '@/data/versions';
import { loadFromLocalStorage, saveToLocalStorage } from '@/utils/storage';

interface HistoryStore {
  versions: DataVersion[];
  currentVersionId: string;
  compareVersionId: string | null;
  loadVersion: (id: string) => void;
  setCompareVersion: (id: string | null) => void;
  createVersion: (version: Omit<DataVersion, 'id' | 'timestamp'>) => void;
  loadVersionsFromStorage: () => void;
}

const STORAGE_KEY = 'data_versions';

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  versions: dataVersions,
  currentVersionId: dataVersions[dataVersions.length - 1].id,
  compareVersionId: null,

  loadVersion: (id) => set({ currentVersionId: id }),
  setCompareVersion: (id) => set({ compareVersionId: id }),

  createVersion: (versionData) => {
    const newVersion: DataVersion = {
      ...versionData,
      id: `v${Date.now()}`,
      timestamp: new Date(),
    };
    const newVersions = [...get().versions, newVersion];
    set({ versions: newVersions, currentVersionId: newVersion.id });
    saveToLocalStorage(STORAGE_KEY, newVersions);
  },

  loadVersionsFromStorage: () => {
    const stored = loadFromLocalStorage<DataVersion[]>(STORAGE_KEY, []);
    if (stored.length > 0) {
      set({ versions: stored, currentVersionId: stored[stored.length - 1].id });
    }
  },
}));
