import { create } from "zustand";
import type { Building, NoiseSource, FloorNoise, ImportRecord, ConflictItem } from "@/types";
import { MOCK_BUILDINGS, MOCK_NOISE_SOURCES } from "@/data/mockData";
import { computeAllFloorNoise, detectConflicts, getTimeCoverage } from "@/utils/noiseCalculation";

interface NoiseStore {
  buildings: Building[];
  noiseSources: NoiseSource[];
  selectedBuildingId: string | null;
  selectedFloor: number | null;
  currentHour: number;
  isPlaying: boolean;
  enabledTypes: Set<string>;
  floorNoiseMap: Map<string, FloorNoise[]>;
  importRecords: ImportRecord[];
  conflicts: ConflictItem[];
  timeCoverage: { hour: number; hasData: boolean; sourceTypes: string[] }[];
  playbackInterval: ReturnType<typeof setInterval> | null;

  setBuildings: (buildings: Building[]) => void;
  addNoiseSource: (source: NoiseSource) => void;
  selectBuilding: (id: string | null) => void;
  selectFloor: (floor: number | null) => void;
  setCurrentHour: (hour: number) => void;
  togglePlayback: () => void;
  toggleSourceType: (type: string) => void;
  addImportRecord: (record: ImportRecord) => void;
  recompute: () => void;
}

const DEFAULT_ENABLED = new Set(["road", "construction", "commercial"]);

function computeInitialState() {
  const buildings = MOCK_BUILDINGS;
  const sources = MOCK_NOISE_SOURCES;
  const enabledTypes = DEFAULT_ENABLED;
  const hour = 10;
  const floorNoiseMap = computeAllFloorNoise(buildings, sources, hour, enabledTypes);
  const conflicts = detectConflicts(sources);
  const timeCoverage = getTimeCoverage(sources, enabledTypes);
  return { buildings, sources, floorNoiseMap, conflicts, timeCoverage };
}

const initial = computeInitialState();

export const useNoiseStore = create<NoiseStore>((set, get) => ({
  buildings: initial.buildings,
  noiseSources: initial.sources,
  selectedBuildingId: null,
  selectedFloor: null,
  currentHour: 10,
  isPlaying: false,
  enabledTypes: new Set(DEFAULT_ENABLED),
  floorNoiseMap: initial.floorNoiseMap,
  importRecords: [
    {
      id: "imp-1",
      fileName: "楼栋与道路声源.json",
      importedAt: Date.now() - 3600000,
      type: "road",
      timeCoverage: [
        { startHour: 0, endHour: 24, level: 0 },
      ],
      status: "success",
    },
    {
      id: "imp-2",
      fileName: "工地与商业街时段数据.json",
      importedAt: Date.now() - 1800000,
      type: "construction",
      timeCoverage: [
        { startHour: 8, endHour: 20, level: 0 },
        { startHour: 10, endHour: 22, level: 0 },
      ],
      status: "success",
    },
  ],
  conflicts: initial.conflicts,
  timeCoverage: initial.timeCoverage,
  playbackInterval: null,

  setBuildings: (buildings) => {
    set({ buildings });
    get().recompute();
  },

  addNoiseSource: (source) => {
    const existing = get().noiseSources;
    const isDuplicate = existing.some(
      (s) =>
        s.type === source.type &&
        s.position[0] === source.position[0] &&
        s.position[2] === source.position[2] &&
        s.baseLevel === source.baseLevel
    );
    if (isDuplicate) {
      const record: ImportRecord = {
        id: `imp-${Date.now()}`,
        fileName: source.name,
        importedAt: Date.now(),
        type: source.type,
        timeCoverage: source.timeRanges,
        status: "duplicate",
        conflictDetail: "声源位置和声压级与已有数据重复",
      };
      set({ importRecords: [...get().importRecords, record] });
      return;
    }
    set({ noiseSources: [...existing, source] });
    const record: ImportRecord = {
      id: `imp-${Date.now()}`,
      fileName: source.name,
      importedAt: Date.now(),
      type: source.type,
      timeCoverage: source.timeRanges,
      status: "success",
    };
    set({ importRecords: [...get().importRecords, record] });
    get().recompute();
  },

  selectBuilding: (id) => {
    set({ selectedBuildingId: id, selectedFloor: id ? 1 : null });
  },

  selectFloor: (floor) => {
    set({ selectedFloor: floor });
  },

  setCurrentHour: (hour) => {
    set({ currentHour: hour });
    get().recompute();
  },

  togglePlayback: () => {
    const { isPlaying, playbackInterval } = get();
    if (isPlaying) {
      if (playbackInterval) clearInterval(playbackInterval);
      set({ isPlaying: false, playbackInterval: null });
    } else {
      const interval = setInterval(() => {
        const { currentHour } = get();
        const nextHour = (currentHour + 1) % 24;
        set({ currentHour: nextHour });
        get().recompute();
      }, 800);
      set({ isPlaying: true, playbackInterval: interval });
    }
  },

  toggleSourceType: (type) => {
    const newEnabled = new Set(get().enabledTypes);
    if (newEnabled.has(type)) {
      newEnabled.delete(type);
    } else {
      newEnabled.add(type);
    }
    set({ enabledTypes: newEnabled });
    get().recompute();
  },

  addImportRecord: (record) => {
    set({ importRecords: [...get().importRecords, record] });
  },

  recompute: () => {
    const { buildings, noiseSources, currentHour, enabledTypes } = get();
    const floorNoiseMap = computeAllFloorNoise(buildings, noiseSources, currentHour, enabledTypes);
    const conflicts = detectConflicts(noiseSources);
    const timeCoverage = getTimeCoverage(noiseSources, enabledTypes);
    set({ floorNoiseMap, conflicts, timeCoverage });
  },
}));
