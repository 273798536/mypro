import type {
  GisPoint,
  Scheme,
  Note,
  ScreenshotMeta,
  VersionRecord,
  MergeRelation,
  FilterState,
  PointStatus,
} from '@/types';
import { MOCK_POINTS, MOCK_SCHEMES, MOCK_NOTES, MOCK_SCREENSHOTS, MOCK_VERSION_HISTORY, MOCK_MERGE_RELATIONS } from '@/data/mockPoints';

const genId = () => Math.random().toString(36).slice(2, 11);
const now = () => new Date().toISOString();

interface AppState {
  points: GisPoint[];
  schemes: Scheme[];
  notes: Note[];
  screenshots: ScreenshotMeta[];
  versionHistory: VersionRecord[];
  mergeRelations: MergeRelation[];
  filters: FilterState;
  actions: {
    addPoint: (point: Omit<GisPoint, 'id' | 'created_at' | 'updated_at'>) => void;
    updatePoint: (id: string, updates: Partial<GisPoint>, changedBy?: string) => void;
    addScheme: (scheme: Omit<Scheme, 'id' | 'created_at'>) => void;
    addNote: (note: Omit<Note, 'id' | 'created_at'>) => void;
    addScreenshot: (screenshot: Omit<ScreenshotMeta, 'id' | 'created_at'>) => void;
    mergePoints: (sourceId: string, targetId: string, evidence: { name_similarity: number; distance_meters: number }, mergedBy?: string) => void;
    setFilters: (filters: Partial<FilterState>) => void;
    resetFilters: () => void;
    importPoints: (points: Array<Omit<GisPoint, 'id' | 'created_at' | 'updated_at'>>) => void;
  };
}

const DEFAULT_FILTERS: FilterState = {
  status: [],
  source: [],
  has_notes: null,
  has_screenshots: null,
  has_conflict: null,
  keyword: '',
  date_from: null,
  date_to: null,
};

const PERSIST_KEY = 'slow-bridge-app-state-v1';

function loadInitialState(): Partial<AppState> {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        points: parsed.points ?? MOCK_POINTS,
        schemes: parsed.schemes ?? MOCK_SCHEMES,
        notes: parsed.notes ?? MOCK_NOTES,
        screenshots: parsed.screenshots ?? MOCK_SCREENSHOTS,
        versionHistory: parsed.versionHistory ?? MOCK_VERSION_HISTORY,
        mergeRelations: parsed.mergeRelations ?? MOCK_MERGE_RELATIONS,
        filters: parsed.filters ?? DEFAULT_FILTERS,
      };
    }
  } catch {
    // ignore
  }
  return {
    points: MOCK_POINTS,
    schemes: MOCK_SCHEMES,
    notes: MOCK_NOTES,
    screenshots: MOCK_SCREENSHOTS,
    versionHistory: MOCK_VERSION_HISTORY,
    mergeRelations: MOCK_MERGE_RELATIONS,
    filters: DEFAULT_FILTERS,
  };
}

import { create } from 'zustand';

const initial = loadInitialState();

export const useAppStore = create<AppState>((set, get) => ({
  points: initial.points!,
  schemes: initial.schemes!,
  notes: initial.notes!,
  screenshots: initial.screenshots!,
  versionHistory: initial.versionHistory!,
  mergeRelations: initial.mergeRelations!,
  filters: initial.filters!,

  actions: {
    addPoint: (point) => {
      const newPoint: GisPoint = {
        ...point,
        id: genId(),
        created_at: now(),
        updated_at: now(),
      };
      set((state) => ({ points: [newPoint, ...state.points] }));
    },

    updatePoint: (id, updates, changedBy = '周姐') => {
      const state = get();
      const old = state.points.find((p) => p.id === id);
      if (!old) return;
      const versionRecords: VersionRecord[] = [];
      Object.entries(updates).forEach(([key, value]) => {
        if (key in old && String(old[key as keyof GisPoint]) !== String(value)) {
          versionRecords.push({
            id: genId(),
            point_id: id,
            field_name: key,
            old_value: String(old[key as keyof GisPoint] ?? ''),
            new_value: String(value ?? ''),
            changed_at: now(),
            changed_by: changedBy,
          });
        }
      });
      const corrected = new Set(old.corrected_fields);
      versionRecords.forEach((r) => corrected.add(r.field_name));
      set((s) => ({
        points: s.points.map((p) =>
          p.id === id
            ? { ...p, ...updates, corrected_fields: Array.from(corrected), updated_at: now() }
            : p,
        ),
        versionHistory: [...versionRecords, ...s.versionHistory],
      }));
    },

    addScheme: (scheme) => {
      const state = get();
      const pointSchemes = state.schemes.filter((s) => s.point_id === scheme.point_id);
      let isConflict = false;
      if (pointSchemes.length > 0) {
        const existing = pointSchemes.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )[0];
        if (existing && scheme.version < existing.version) {
          isConflict = true;
        }
      }
      const newScheme: Scheme = {
        ...scheme,
        id: genId(),
        created_at: now(),
        is_conflict: isConflict || scheme.is_conflict,
      };
      set((s) => ({ schemes: [newScheme, ...s.schemes] }));
    },

    addNote: (note) => {
      const newNote: Note = { ...note, id: genId(), created_at: now() };
      set((s) => ({ notes: [newNote, ...s.notes] }));
    },

    addScreenshot: (screenshot) => {
      const newShot: ScreenshotMeta = { ...screenshot, id: genId(), created_at: now() };
      set((s) => ({ screenshots: [newShot, ...s.screenshots] }));
    },

    mergePoints: (sourceId, targetId, evidence, mergedBy = '周姐') => {
      const relation: MergeRelation = {
        id: genId(),
        source_point_id: sourceId,
        target_point_id: targetId,
        name_similarity: evidence.name_similarity,
        distance_meters: evidence.distance_meters,
        merged_at: now(),
        merged_by: mergedBy,
      };
      set((s) => ({
        mergeRelations: [relation, ...s.mergeRelations],
        points: s.points.map((p) =>
          p.id === sourceId ? { ...p, status: 'merged' as PointStatus, updated_at: now() } : p,
        ),
      }));
    },

    setFilters: (filters) => {
      set((s) => ({ filters: { ...s.filters, ...filters } }));
    },

    resetFilters: () => {
      set({ filters: DEFAULT_FILTERS });
    },

    importPoints: (points) => {
      const newPoints: GisPoint[] = points.map((p) => ({
        ...p,
        id: genId(),
        created_at: now(),
        updated_at: now(),
      }));
      set((s) => ({ points: [...newPoints, ...s.points] }));
    },
  },
}));

useAppStore.subscribe((state) => {
  const toPersist = {
    points: state.points,
    schemes: state.schemes,
    notes: state.notes,
    screenshots: state.screenshots,
    versionHistory: state.versionHistory,
    mergeRelations: state.mergeRelations,
    filters: state.filters,
  };
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(toPersist));
  } catch {
    // ignore
  }
});
