import { create } from 'zustand';
import {
  GameMaterials,
  DefrostSlot,
  ImportStrategy,
  MaterialSource,
  LevelResult,
} from '@/types';
import { defaultMaterials, simulate, scoreLevel, SimulationResult } from '@/engine/simulator';

interface GameState {
  materials: GameMaterials;
  sources: MaterialSource[];
  lastSim: SimulationResult | null;
  lastResult: LevelResult | null;
  playbackIndex: number;
  playbackPlaying: boolean;
  playbackSpeed: number;
  setMaterials: (m: GameMaterials) => void;
  applyImport: (incoming: GameMaterials, strategy: ImportStrategy, fileName: string) => void;
  resetToDefault: () => void;
  updateDefrost: (slotId: string, patch: Partial<DefrostSlot>) => void;
  addDefrost: (slot: DefrostSlot) => void;
  removeDefrost: (slotId: string) => void;
  runSimulation: () => void;
  setPlayback: (patch: Partial<Pick<GameState, 'playbackIndex' | 'playbackPlaying' | 'playbackSpeed'>>) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  materials: defaultMaterials(),
  sources: [],
  lastSim: null,
  lastResult: null,
  playbackIndex: 0,
  playbackPlaying: false,
  playbackSpeed: 1,

  setMaterials: (materials) => set({ materials }),

  applyImport: (incoming, strategy, fileName) => {
    const current = get().materials;
    const sources = get().sources;
    const batchId = `b-${Date.now()}`;
    const next: GameMaterials = { ...current };
    const counts: Record<string, number> = {};

    const merge = <T extends { id: string }>(
      currentList: T[],
      incomingList: T[],
      key: keyof GameMaterials,
    ): T[] => {
      if (!incomingList?.length) return currentList;
      counts[key as string] = incomingList.length;
      if (strategy === 'ignore') {
        const existing = new Set(currentList.map((x) => x.id));
        return [...currentList, ...incomingList.filter((x) => !existing.has(x.id))];
      }
      if (strategy === 'overwrite') {
        const map = new Map(currentList.map((x) => [x.id, x]));
        incomingList.forEach((x) => map.set(x.id, x));
        return Array.from(map.values());
      }
      const prefix = batchId + '-';
      return [
        ...currentList,
        ...incomingList.map((x) => ({ ...x, id: prefix + x.id })),
      ];
    };

    next.zones = merge(current.zones, incoming.zones, 'zones');
    next.evaporators = merge(current.evaporators, incoming.evaporators, 'evaporators');
    next.tempLayers = merge(current.tempLayers, incoming.tempLayers, 'tempLayers');
    next.tasks = merge(current.tasks, incoming.tasks, 'tasks');
    next.defrostSlots = merge(current.defrostSlots, incoming.defrostSlots, 'defrostSlots');
    next.opReports = [...current.opReports, ...(incoming.opReports ?? [])];

    const newSource: MaterialSource = {
      batchId,
      fileName,
      importedAt: Date.now(),
      strategy,
      itemCounts: counts,
    };
    set({
      materials: next,
      sources: [newSource, ...sources],
      lastSim: null,
      lastResult: null,
    });
  },

  resetToDefault: () =>
    set({
      materials: defaultMaterials(),
      sources: [],
      lastSim: null,
      lastResult: null,
    }),

  updateDefrost: (slotId, patch) => {
    const { materials } = get();
    const defrostSlots = materials.defrostSlots.map((s) =>
      s.id === slotId ? { ...s, ...patch } : s,
    );
    set({ materials: { ...materials, defrostSlots } });
  },

  addDefrost: (slot) => {
    const { materials } = get();
    set({ materials: { ...materials, defrostSlots: [...materials.defrostSlots, slot] } });
  },

  removeDefrost: (slotId) => {
    const { materials } = get();
    set({
      materials: {
        ...materials,
        defrostSlots: materials.defrostSlots.filter((s) => s.id !== slotId),
      },
    });
  },

  runSimulation: () => {
    const { materials } = get();
    const sim = simulate({
      zones: materials.zones,
      evaporators: materials.evaporators,
      tempLayers: materials.tempLayers,
      tasks: materials.tasks,
      defrostSlots: materials.defrostSlots,
    });
    const result = scoreLevel(sim, materials);
    set({ lastSim: sim, lastResult: result, playbackIndex: 0, playbackPlaying: false });
  },

  setPlayback: (patch) => set((s) => ({ ...s, ...patch })),
}));
