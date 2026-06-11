import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  FilterState,
  Note,
  NoteType,
  ViewSnapshot,
  Viewport,
  FlagType,
} from '@/types';
import { MOCK_NOTES } from '@/data/mockPoints';
import { encodeHash, decodeHash } from '@/utils/csv';

const DEFAULT_FILTERS: FilterState = {
  codes: [],
  minDepth: 0,
  maxDepth: 60,
  flags: [],
};

const DEFAULT_VIEWPORT: Viewport = { scale: 1, offsetX: 0, offsetY: 0 };

interface AppState {
  filterState: FilterState;
  selectedPointId: string | null;
  notes: Note[];
  viewSnapshots: ViewSnapshot[];
  viewport: Viewport;
  showHelp: boolean;
  activeDetailTab: 'detail' | 'notes' | 'csv';

  setFilters: (patch: Partial<FilterState>) => void;
  toggleFlagFilter: (flag: FlagType) => void;
  toggleCodeFilter: (code: string) => void;
  setDepthRange: (min: number, max: number) => void;
  resetFilters: () => void;

  selectPoint: (id: string | null) => void;
  setActiveDetailTab: (tab: 'detail' | 'notes' | 'csv') => void;

  addNote: (pointId: string, type: NoteType, content: string, author: string) => void;
  deleteNote: (noteId: string) => void;

  setViewport: (patch: Partial<Viewport>) => void;
  saveViewSnapshot: (name: string) => void;
  restoreViewSnapshot: (id: string) => void;
  deleteViewSnapshot: (id: string) => void;

  setShowHelp: (show: boolean) => void;
  resetAll: () => void;
}

function syncHashToFilters(state: AppState) {
  try {
    const hashPayload = {
      f: state.filterState,
      s: state.selectedPointId,
      v: state.viewport,
    };
    window.location.hash = encodeHash(hashPayload);
  } catch {
    // ignore
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      filterState: DEFAULT_FILTERS,
      selectedPointId: null,
      notes: MOCK_NOTES,
      viewSnapshots: [],
      viewport: DEFAULT_VIEWPORT,
      showHelp: false,
      activeDetailTab: 'detail',

      setFilters: (patch) =>
        set((s) => {
          const next = { ...s.filterState, ...patch };
          setTimeout(() => syncHashToFilters({ ...s, filterState: next }), 0);
          return { filterState: next };
        }),
      toggleFlagFilter: (flag) =>
        set((s) => {
          const flags = s.filterState.flags.includes(flag)
            ? s.filterState.flags.filter((f) => f !== flag)
            : [...s.filterState.flags, flag];
          const next = { ...s.filterState, flags };
          setTimeout(() => syncHashToFilters({ ...s, filterState: next }), 0);
          return { filterState: next };
        }),
      toggleCodeFilter: (code) =>
        set((s) => {
          const codes = s.filterState.codes.includes(code)
            ? s.filterState.codes.filter((c) => c !== code)
            : [...s.filterState.codes, code];
          const next = { ...s.filterState, codes };
          setTimeout(() => syncHashToFilters({ ...s, filterState: next }), 0);
          return { filterState: next };
        }),
      setDepthRange: (min, max) =>
        set((s) => {
          const next = { ...s.filterState, minDepth: min, maxDepth: max };
          setTimeout(() => syncHashToFilters({ ...s, filterState: next }), 0);
          return { filterState: next };
        }),
      resetFilters: () =>
        set((s) => {
          setTimeout(() => syncHashToFilters({ ...s, filterState: DEFAULT_FILTERS }), 0);
          return { filterState: DEFAULT_FILTERS };
        }),

      selectPoint: (id) =>
        set((s) => {
          const next = { ...s, selectedPointId: id };
          setTimeout(() => syncHashToFilters(next), 0);
          return { selectedPointId: id };
        }),
      setActiveDetailTab: (tab) => set({ activeDetailTab: tab }),

      addNote: (pointId, type, content, author) =>
        set((s) => ({
          notes: [
            ...s.notes,
            {
              id: `n-${Date.now()}`,
              pointId,
              type,
              content,
              author,
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      deleteNote: (noteId) => set((s) => ({ notes: s.notes.filter((n) => n.id !== noteId) })),

      setViewport: (patch) =>
        set((s) => {
          const next = { ...s.viewport, ...patch };
          const nextState = { ...s, viewport: next };
          setTimeout(() => syncHashToFilters(nextState), 0);
          return { viewport: next };
        }),
      saveViewSnapshot: (name) =>
        set((s) => ({
          viewSnapshots: [
            ...s.viewSnapshots,
            {
              id: `snap-${Date.now()}`,
              name,
              filters: JSON.parse(JSON.stringify(s.filterState)),
              viewport: JSON.parse(JSON.stringify(s.viewport)),
              selectedPointId: s.selectedPointId,
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      restoreViewSnapshot: (id) => {
        const snap = get().viewSnapshots.find((s) => s.id === id);
        if (!snap) return;
        set({
          filterState: snap.filters,
          viewport: snap.viewport,
          selectedPointId: snap.selectedPointId,
        });
      },
      deleteViewSnapshot: (id) =>
        set((s) => ({ viewSnapshots: s.viewSnapshots.filter((x) => x.id !== id) })),

      setShowHelp: (show) => set({ showHelp: show }),
      resetAll: () =>
        set({
          filterState: DEFAULT_FILTERS,
          selectedPointId: null,
          viewport: DEFAULT_VIEWPORT,
          notes: MOCK_NOTES,
        }),
    }),
    {
      name: 'gw-profile-state-v1',
      partialize: (state) => ({
        filterState: state.filterState,
        notes: state.notes,
        viewSnapshots: state.viewSnapshots,
        viewport: state.viewport,
        activeDetailTab: state.activeDetailTab,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        try {
          const fromHash = decodeHash<{
            f?: FilterState;
            s?: string | null;
            v?: Viewport;
          }>(window.location.hash);
          if (fromHash) {
            if (fromHash.f) state.filterState = fromHash.f;
            if (fromHash.s !== undefined) state.selectedPointId = fromHash.s ?? null;
            if (fromHash.v) state.viewport = fromHash.v;
          }
        } catch {
          // ignore
        }
      },
    },
  ),
);
