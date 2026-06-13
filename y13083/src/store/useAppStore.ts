import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  HazardObject,
  CadLayer,
  ManualNote,
  ViewSnapshot,
  FilterState,
  CameraState,
  DataSource,
  HazardType,
} from '@/types';
import { mockLayers } from '@/data/layers';
import { mockObjects } from '@/data/objects';
import { mockNotes } from '@/data/notes';

interface AppState {
  layers: CadLayer[];
  objects: HazardObject[];
  notes: ManualNote[];
  snapshots: ViewSnapshot[];
  selectedObjectId: string | null;
  filterState: FilterState;
  cameraState: CameraState;
  guideVisible: boolean;

  setSelectedObject: (id: string | null) => void;
  toggleLayer: (layerId: string) => void;
  toggleSource: (source: DataSource) => void;
  toggleType: (type: HazardType) => void;
  setShowAbnormalOnly: (v: boolean) => void;
  setShowOverlappingOnly: (v: boolean) => void;
  addNote: (objectId: string, content: string, author: string) => void;
  saveSnapshot: (name: string) => void;
  restoreSnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => void;
  setCameraState: (position: [number, number, number], target: [number, number, number]) => void;
  setGuideVisible: (v: boolean) => void;
  resetAll: () => void;
  focusObject: (id: string) => void;
}

const defaultFilter: FilterState = {
  sources: ['cad_old', 'normal', 'verbal'],
  showAbnormalOnly: false,
  showOverlappingOnly: false,
  types: ['tank', 'pipe', 'valve', 'storage'],
};

const defaultCamera: CameraState = {
  position: [8, 8, 12],
  target: [0, 1, 0],
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      layers: mockLayers,
      objects: mockObjects,
      notes: mockNotes,
      snapshots: [],
      selectedObjectId: null,
      filterState: defaultFilter,
      cameraState: defaultCamera,
      guideVisible: true,

      setSelectedObject: (id) => set({ selectedObjectId: id }),

      toggleLayer: (layerId) =>
        set({
          layers: get().layers.map((l) =>
            l.id === layerId ? { ...l, visible: !l.visible } : l,
          ),
        }),

      toggleSource: (source) => {
        const { sources } = get().filterState;
        const next = sources.includes(source)
          ? sources.filter((s) => s !== source)
          : [...sources, source];
        set({ filterState: { ...get().filterState, sources: next } });
      },

      toggleType: (type) => {
        const { types } = get().filterState;
        const next = types.includes(type)
          ? types.filter((t) => t !== type)
          : [...types, type];
        set({ filterState: { ...get().filterState, types: next } });
      },

      setShowAbnormalOnly: (v) =>
        set({ filterState: { ...get().filterState, showAbnormalOnly: v } }),

      setShowOverlappingOnly: (v) =>
        set({ filterState: { ...get().filterState, showOverlappingOnly: v } }),

      addNote: (objectId, content, author) => {
        const newNote: ManualNote = {
          id: `note-${Date.now()}`,
          objectId,
          content,
          author,
          createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
        };
        set({ notes: [newNote, ...get().notes] });
      },

      saveSnapshot: (name) => {
        const { cameraState, filterState, layers } = get();
        const snap: ViewSnapshot = {
          id: `snap-${Date.now()}`,
          name,
          cameraPosition: cameraState.position,
          cameraTarget: cameraState.target,
          filterState: JSON.parse(JSON.stringify(filterState)),
          visibleLayers: layers.filter((l) => l.visible).map((l) => l.id),
          createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
        };
        set({ snapshots: [snap, ...get().snapshots] });
      },

      restoreSnapshot: (id) => {
        const snap = get().snapshots.find((s) => s.id === id);
        if (!snap) return;
        set({
          filterState: snap.filterState,
          cameraState: {
            position: snap.cameraPosition,
            target: snap.cameraTarget,
          },
          layers: get().layers.map((l) => ({
            ...l,
            visible: snap.visibleLayers.includes(l.id),
          })),
        });
      },

      deleteSnapshot: (id) =>
        set({ snapshots: get().snapshots.filter((s) => s.id !== id) }),

      setCameraState: (position, target) =>
        set({ cameraState: { position, target } }),

      setGuideVisible: (v) => set({ guideVisible: v }),

      resetAll: () =>
        set({
          layers: mockLayers,
          filterState: defaultFilter,
          cameraState: defaultCamera,
          selectedObjectId: null,
        }),

      focusObject: (id) => {
        const obj = get().objects.find((o) => o.id === id);
        if (!obj) return;
        const [x, y, z] = obj.position;
        set({
          selectedObjectId: id,
          cameraState: {
            position: [x + 5, y + 4, z + 6],
            target: [x, y, z],
          },
        });
      },
    }),
    {
      name: 'dock-hazard-store',
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        const state = (persistedState || {}) as Record<string, unknown>;

        if (version < 2) {
          const filter = (state.filterState || {}) as Record<string, unknown>;
          const sources = Array.isArray(filter.sources) ? [...filter.sources] : [];
          if (!sources.includes('cad_old')) sources.push('cad_old');
          state.filterState = {
            sources,
            showAbnormalOnly: Boolean(filter.showAbnormalOnly),
            showOverlappingOnly: Boolean(filter.showOverlappingOnly),
            types: Array.isArray(filter.types) && filter.types.length > 0
              ? filter.types
              : ['tank', 'pipe', 'valve', 'storage'],
          };

          const layers = Array.isArray(state.layers) ? (state.layers as CadLayer[]) : [];
          state.layers = layers.map((l) => (l.isOldVersion ? { ...l, visible: true } : l));
        }

        if (typeof state.guideVisible !== 'boolean') {
          state.guideVisible = true;
        }
        if (!Array.isArray(state.snapshots)) state.snapshots = [];
        if (!Array.isArray(state.notes)) state.notes = mockNotes;

        return state as unknown as AppState;
      },
      partialize: (state) => ({
        filterState: state.filterState,
        notes: state.notes,
        snapshots: state.snapshots,
        layers: state.layers,
        cameraState: state.cameraState,
        guideVisible: state.guideVisible,
      }),
    },
  ),
);

export const getFilteredObjects = (
  objects: HazardObject[],
  layers: CadLayer[],
  filter: FilterState,
): HazardObject[] => {
  const visibleLayerIds = new Set(layers.filter((l) => l.visible).map((l) => l.id));
  return objects.filter((o) => {
    if (!visibleLayerIds.has(o.layerId)) return false;
    if (!filter.sources.includes(o.source)) return false;
    if (!filter.types.includes(o.type)) return false;
    if (filter.showAbnormalOnly && !o.isAbnormal) return false;
    if (filter.showOverlappingOnly && !o.isOverlapping) return false;
    return true;
  });
};
