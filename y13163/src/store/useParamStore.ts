import { create } from 'zustand';
import type { ParamVersion } from '@/types';
import { paramVersions, defaultVersion } from '@/data/formulas';

interface ParamStore {
  versions: ParamVersion[];
  currentVersion: string;
  versionHistory: string[];
  setCurrentVersion: (version: string) => void;
  getCurrentVersionData: () => ParamVersion | undefined;
}

export const useParamStore = create<ParamStore>((set, get) => ({
  versions: paramVersions,
  currentVersion: defaultVersion,
  versionHistory: [defaultVersion],

  setCurrentVersion: (version) =>
    set((state) => ({
      currentVersion: version,
      versionHistory: state.versionHistory.includes(version)
        ? state.versionHistory
        : [...state.versionHistory, version],
    })),

  getCurrentVersionData: () => {
    const { versions, currentVersion } = get();
    return versions.find((v) => v.version === currentVersion);
  },
}));
