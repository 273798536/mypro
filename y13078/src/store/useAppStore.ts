import { create } from 'zustand';
import type {
  Point, ViewPreset, FilterState, OverlapPair, UnifiedSummary, Cabinet,
} from '../../shared/types';

interface AppState {
  loading: boolean;
  error: string | null;

  points: Point[];
  cabinets: Cabinet[];
  views: ViewPreset[];
  overlaps: OverlapPair[];
  summary: UnifiedSummary | null;

  filters: FilterState;
  activeViewId: string | null;

  selectedPointId: string | null;
  hoverPointId: string | null;

  zoom: number;
  panX: number;
  panY: number;

  viewDrawerOpen: boolean;
  summaryModalOpen: boolean;
  exportMenuOpen: boolean;

  remarkSavingId: string | null;

  refreshAll: () => Promise<void>;
  setFilters: (partial: Partial<FilterState>) => void;
  setSelectedPoint: (id: string | null) => void;
  setHoverPoint: (id: string | null) => void;
  setViewTransform: (zoom: number, panX: number, panY: number) => void;
  setActiveViewId: (id: string | null) => void;

  openViewDrawer: () => void;
  closeViewDrawer: () => void;
  openSummaryModal: () => Promise<void>;
  closeSummaryModal: () => void;
  toggleExportMenu: () => void;

  saveViewPreset: (name: string, thumbnail?: string) => Promise<ViewPreset | null>;
  applyViewPreset: (view: ViewPreset) => void;
  deleteViewPreset: (id: string) => Promise<void>;

  updateRemark: (pointId: string, remark: string, operator?: string) => Promise<void>;
  markWithdrawn: (pointId: string, reason: string, operator?: string) => Promise<void>;
  addSupplement: (pointId: string, content: string, operator?: string) => Promise<void>;
  markBadData: (pointId: string, reason: string, originalRow: number) => Promise<void>;

  locatePointOnCanvas: (pointId: string) => void;
}

const DEFAULT_FILTERS: FilterState = {
  regions: ['A', 'B'],
  types: ['sensor', 'outlet', 'switch', 'cable'],
  statuses: ['normal', 'warning', 'error'],
  showWithdrawn: true,
  showSupplements: true,
};

async function safeFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const useAppStore = create<AppState>((set, get) => ({
  loading: false,
  error: null,
  points: [],
  cabinets: [],
  views: [],
  overlaps: [],
  summary: null,
  filters: DEFAULT_FILTERS,
  activeViewId: null,
  selectedPointId: null,
  hoverPointId: null,
  zoom: 0.85,
  panX: 0,
  panY: 0,
  viewDrawerOpen: false,
  summaryModalOpen: false,
  exportMenuOpen: false,
  remarkSavingId: null,

  refreshAll: async () => {
    set({ loading: true, error: null });
    try {
      const [points, cabinets, views, overlapsRes] = await Promise.all([
        safeFetch<Point[]>('/api/points?includeWithdrawn=true'),
        safeFetch<Cabinet[]>('/api/summary/cabinets'),
        safeFetch<ViewPreset[]>('/api/views'),
        safeFetch<{ pairs: OverlapPair[]; totalPoints: number; checkedAt: number }>('/api/detect/overlaps'),
      ]);
      set({
        points,
        cabinets,
        views,
        overlaps: overlapsRes.pairs,
        loading: false,
      });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  setFilters: (partial) => set({ filters: { ...get().filters, ...partial }, activeViewId: null }),
  setSelectedPoint: (id) => set({ selectedPointId: id }),
  setHoverPoint: (id) => set({ hoverPointId: id }),
  setViewTransform: (zoom, panX, panY) => set({ zoom, panX, panY }),
  setActiveViewId: (id) => set({ activeViewId: id }),

  openViewDrawer: () => set({ viewDrawerOpen: true }),
  closeViewDrawer: () => set({ viewDrawerOpen: false }),

  openSummaryModal: async () => {
    try {
      const summary = await safeFetch<UnifiedSummary>('/api/summary');
      set({ summary, summaryModalOpen: true });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
  closeSummaryModal: () => set({ summaryModalOpen: false }),
  toggleExportMenu: () => set({ exportMenuOpen: !get().exportMenuOpen }),

  saveViewPreset: async (name, thumbnail = '') => {
    const { zoom, panX, panY, filters } = get();
    try {
      const created = await safeFetch<ViewPreset>('/api/views', {
        method: 'POST',
        body: JSON.stringify({ name, thumbnail, zoom, panX, panY, filters }),
      });
      set({ views: [created, ...get().views] });
      return created;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  applyViewPreset: (view) => {
    set({
      zoom: view.zoom,
      panX: view.panX,
      panY: view.panY,
      filters: view.filters,
      activeViewId: view.id,
    });
  },

  deleteViewPreset: async (id) => {
    try {
      await safeFetch(`/api/views/${id}`, { method: 'DELETE' });
      set({ views: get().views.filter(v => v.id !== id) });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  updateRemark: async (pointId, remark, operator = '排班同事') => {
    set({ remarkSavingId: pointId });
    try {
      const updated = await safeFetch<Point>(`/api/points/${pointId}/remark`, {
        method: 'PATCH',
        body: JSON.stringify({ remark, operator }),
      });
      const points = get().points.map(p => p.id === pointId ? updated : p);
      set({ points, remarkSavingId: null });
    } catch (e) {
      set({ error: (e as Error).message, remarkSavingId: null });
    }
  },

  markWithdrawn: async (pointId, reason, operator = '排班同事') => {
    try {
      const updated = await safeFetch<Point>(`/api/points/${pointId}/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ reason, operator }),
      });
      const points = get().points.map(p => p.id === pointId ? updated : p);
      set({ points });
      const res = await safeFetch<{ pairs: OverlapPair[] }>('/api/detect/overlaps');
      set({ overlaps: res.pairs });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  addSupplement: async (pointId, content, operator = '排班同事') => {
    try {
      const updated = await safeFetch<Point>(`/api/points/${pointId}/supplement`, {
        method: 'POST',
        body: JSON.stringify({ content, operator }),
      });
      const points = get().points.map(p => p.id === pointId ? updated : p);
      set({ points });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  markBadData: async (pointId, reason, originalRow) => {
    try {
      const updated = await safeFetch<Point>(`/api/points/${pointId}/bad-data`, {
        method: 'POST',
        body: JSON.stringify({ reason, originalRow }),
      });
      const points = get().points.map(p => p.id === pointId ? updated : p);
      set({ points });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  locatePointOnCanvas: (pointId) => {
    const { points } = get();
    const p = points.find(pt => pt.id === pointId);
    if (!p) return;
    set({
      selectedPointId: pointId,
      panX: 450 - p.x,
      panY: 400 - p.y,
      zoom: 1.2,
      activeViewId: null,
    });
  },
}));
