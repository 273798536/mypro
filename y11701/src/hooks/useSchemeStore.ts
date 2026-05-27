import { create } from 'zustand';
import type { Scheme, SchemeParams, Revision, ImportStrategy } from '@/types';
import { loadSchemes, saveSchemes, deleteScheme as delScheme } from '@/utils/storage';
import { calcMMC } from '@/utils/queueTheory';
import { detectAnomalies } from '@/utils/anomaly';

interface SchemeState {
  schemes: Scheme[];
  currentId: string | null;
  init: () => void;
  createScheme: (name: string, params: SchemeParams, source: string) => Scheme;
  updateParams: (id: string, params: SchemeParams, source: string, reason: string) => void;
  removeScheme: (id: string) => void;
  importSchemes: (incoming: Scheme[], strategy: ImportStrategy) => void;
  setCurrent: (id: string | null) => void;
  getCurrent: () => Scheme | null;
}

function genId(): string {
  return 'scheme_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

export const useSchemeStore = create<SchemeState>((set, get) => ({
  schemes: [],
  currentId: null,

  init: () => {
    const schemes = loadSchemes();
    set({ schemes });
  },

  createScheme: (name, params, source) => {
    const result = calcMMC(params);
    const anomalies = detectAnomalies(params);
    const now = new Date().toISOString();
    const scheme: Scheme = {
      id: genId(),
      name,
      createdAt: now,
      updatedAt: now,
      source,
      params,
      result,
      anomalies,
      revisions: [],
    };
    const schemes = [...get().schemes, scheme];
    saveSchemes(schemes);
    set({ schemes, currentId: scheme.id });
    return scheme;
  },

  updateParams: (id, params, source, reason) => {
    const schemes = get().schemes.map((s) => {
      if (s.id !== id) return s;
      const oldParams = s.params;
      const revisions: Revision[] = [];
      const now = new Date().toISOString();

      (Object.keys(params) as (keyof SchemeParams)[]).forEach((key) => {
        if (params[key] !== oldParams[key]) {
          revisions.push({
            id: genId(),
            timestamp: now,
            field: key,
            oldValue: String(oldParams[key]),
            newValue: String(params[key]),
            source,
            reason,
          });
        }
      });

      const result = calcMMC(params);
      const anomalies = detectAnomalies(params);

      return {
        ...s,
        params,
        result,
        anomalies,
        revisions: [...s.revisions, ...revisions],
        updatedAt: now,
      };
    });
    saveSchemes(schemes);
    set({ schemes });
  },

  removeScheme: (id) => {
    delScheme(id);
    const schemes = get().schemes.filter((s) => s.id !== id);
    set({ schemes });
  },

  importSchemes: (incoming, strategy) => {
    if (strategy === 'ignore') {
      const existingIds = new Set(get().schemes.map((s) => s.id));
      const newItems = incoming.filter((s) => !existingIds.has(s.id));
      const schemes = [...get().schemes, ...newItems];
      saveSchemes(schemes);
      set({ schemes });
    } else if (strategy === 'overwrite') {
      saveSchemes(incoming);
      set({ schemes: incoming });
    } else {
      const appended = incoming.map((s) => ({
        ...s,
        id: s.id + '_copy_' + Date.now(),
        name: s.name + ' (副本)',
      }));
      const schemes = [...get().schemes, ...appended];
      saveSchemes(schemes);
      set({ schemes });
    }
  },

  setCurrent: (id) => set({ currentId: id }),

  getCurrent: () => {
    const { schemes, currentId } = get();
    return schemes.find((s) => s.id === currentId) || null;
  },
}));
