import { create } from 'zustand';
import type { Scheme, Material, TimelineEntry, ReasonNode, FilterOptions } from '../types';
import { mockSchemes, mockMaterials, mockTimeline, mockReasonNodes } from '../data/mockData';

interface SchemeStore {
  schemes: Scheme[];
  materials: Material[];
  timeline: TimelineEntry[];
  reasonNodes: ReasonNode[];
  filters: FilterOptions;
  setFilters: (filters: Partial<FilterOptions>) => void;
  getSchemeById: (id: string) => Scheme | undefined;
  getMaterialsBySchemeId: (schemeId: string) => Material[];
  getTimelineBySchemeId: (schemeId: string) => TimelineEntry[];
  getReasonNodesBySchemeId: (schemeId: string) => ReasonNode[];
  addMaterial: (material: Material, entry: TimelineEntry, schemeUpdate?: Partial<Scheme>) => void;
  rerunScheme: (schemeId: string, operatorName: string) => void;
  updateConclusion: (schemeId: string, conclusion: string, operatorName: string) => void;
  recordExport: (schemeId: string, operatorName: string) => void;
  filteredSchemes: () => Scheme[];
}

const STORAGE_KEY = 'bus-scheme-store-v1';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function persist(state: Partial<SchemeStore>) {
  try {
    const toSave = {
      schemes: state.schemes,
      materials: state.materials,
      timeline: state.timeline,
      reasonNodes: state.reasonNodes,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // ignore
  }
}

const initial = loadFromStorage(STORAGE_KEY, {
  schemes: mockSchemes,
  materials: mockMaterials,
  timeline: mockTimeline,
  reasonNodes: mockReasonNodes,
});

export const useSchemeStore = create<SchemeStore>((set, get) => ({
  schemes: initial.schemes,
  materials: initial.materials,
  timeline: initial.timeline,
  reasonNodes: initial.reasonNodes,
  filters: {
    keyword: '',
    onlyOverload: false,
    onlyIncomplete: false,
    status: 'all',
  },

  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),

  getSchemeById: (id) => get().schemes.find((s) => s.id === id),

  getMaterialsBySchemeId: (schemeId) =>
    get().materials.filter((m) => m.schemeId === schemeId),

  getTimelineBySchemeId: (schemeId) =>
    get()
      .timeline.filter((t) => t.schemeId === schemeId)
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)),

  getReasonNodesBySchemeId: (schemeId) =>
    get().reasonNodes.filter((r) => r.schemeId === schemeId),

  addMaterial: (material, entry, schemeUpdate) =>
    set((state) => {
      const next = {
        ...state,
        materials: [...state.materials, material],
        timeline: [entry, ...state.timeline],
        schemes: state.schemes.map((s) =>
          s.id === material.schemeId
            ? { ...s, updatedAt: entry.timestamp, ...(schemeUpdate ?? {}) }
            : s
        ),
      };
      persist(next);
      return next;
    }),

  rerunScheme: (schemeId, operatorName) =>
    set((state) => {
      const entry: TimelineEntry = {
        id: `t-${Date.now()}`,
        schemeId,
        type: 'rerun',
        operator: operatorName,
        timestamp: new Date().toISOString(),
        changeSummary: '重跑方案比选计算',
      };
      const next = {
        ...state,
        timeline: [entry, ...state.timeline],
        schemes: state.schemes.map((s) =>
          s.id === schemeId ? { ...s, updatedAt: entry.timestamp } : s
        ),
      };
      persist(next);
      return next;
    }),

  updateConclusion: (schemeId, conclusion, operatorName) =>
    set((state) => {
      const current = state.schemes.find((s) => s.id === schemeId);
      const entry: TimelineEntry = {
        id: `t-${Date.now()}`,
        schemeId,
        type: 'conclusion_change',
        operator: operatorName,
        timestamp: new Date().toISOString(),
        changeSummary: `结论由"${current?.conclusion ?? ''}"改为"${conclusion}"`,
        diff: { before: { conclusion: current?.conclusion }, after: { conclusion } },
      };
      const next = {
        ...state,
        timeline: [entry, ...state.timeline],
        schemes: state.schemes.map((s) =>
          s.id === schemeId ? { ...s, conclusion, updatedAt: entry.timestamp } : s
        ),
      };
      persist(next);
      return next;
    }),

  recordExport: (schemeId, operatorName) =>
    set((state) => {
      const entry: TimelineEntry = {
        id: `t-${Date.now()}`,
        schemeId,
        type: 'export',
        operator: operatorName,
        timestamp: new Date().toISOString(),
        changeSummary: '导出方案比选报告（带超限标记）',
      };
      const next = {
        ...state,
        timeline: [entry, ...state.timeline],
        schemes: state.schemes.map((s) =>
          s.id === schemeId ? { ...s, updatedAt: entry.timestamp } : s
        ),
      };
      persist(next);
      return next;
    }),

  filteredSchemes: () => {
    const { schemes, materials, filters } = get();
    return schemes.filter((s) => {
      if (filters.keyword && !s.name.toLowerCase().includes(filters.keyword.toLowerCase())) {
        return false;
      }
      if (filters.onlyOverload && !s.hasCapacityOverload) return false;
      if (filters.status !== 'all' && s.status !== filters.status) return false;
      if (filters.onlyIncomplete) {
        const count = materials.filter((m) => m.schemeId === s.id).length;
        if (count >= 3) return false;
      }
      return true;
    });
  },
}));
