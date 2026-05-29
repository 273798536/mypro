import { create } from 'zustand';
import type {
  TerrainGrid,
  VillagePoint,
  SpillwayPoint,
  CapacityCurvePoint,
  ValidationResult,
  TerrainConclusion,
  ChangeRecord,
} from '@/types';
import { sampleTerrain, sampleVillages, sampleSpillways, sampleCapacityCurve } from '@/data/sampleTerrain';
import { runAllValidations } from '@/utils/validation';
import { calculateSubmergedArea, calculateCapacity, getSubmergedVillages } from '@/utils/waterLevel';

interface AppState {
  terrain: TerrainGrid | null;
  villages: VillagePoint[];
  spillways: SpillwayPoint[];
  capacityCurve: CapacityCurvePoint[];
  waterLevel: number;
  validationResults: ValidationResult[];
  selectedVillageId: string | null;
  showContourLines: boolean;
  showSubmergedArea: boolean;
  showSpillways: boolean;
  previousConclusion: TerrainConclusion | null;
  changeRecords: ChangeRecord[];
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  interpolationInfo: { method: string; confidence: 'high' | 'medium' | 'low' } | null;

  setTerrain: (terrain: TerrainGrid) => void;
  setWaterLevel: (level: number) => void;
  addVillage: (village: VillagePoint) => void;
  removeVillage: (id: string) => void;
  updateVillage: (id: string, updates: Partial<VillagePoint>) => void;
  setSelectedVillageId: (id: string | null) => void;
  toggleContourLines: () => void;
  toggleSubmergedArea: () => void;
  toggleSpillways: () => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  validateData: () => void;
  computeConclusion: () => TerrainConclusion;
  checkChanges: () => void;
}

function buildConclusion(
  terrain: TerrainGrid | null,
  villages: VillagePoint[],
  waterLevel: number
): TerrainConclusion | null {
  if (!terrain) return null;
  return {
    minElevation: terrain.minElevation,
    maxElevation: terrain.maxElevation,
    totalArea: terrain.gridSize.width * terrain.gridSize.height * terrain.cellSize * terrain.cellSize,
    submergedAreaAtCurrentLevel: calculateSubmergedArea(terrain, waterLevel),
    capacityAtCurrentLevel: calculateCapacity(terrain, waterLevel),
    villagesAtRisk: getSubmergedVillages(
      terrain,
      villages.map((v) => ({ name: v.name, elevation: v.elevation })),
      waterLevel
    ),
    timestamp: new Date().toISOString(),
  };
}

export const useStore = create<AppState>((set, get) => ({
  terrain: sampleTerrain,
  villages: sampleVillages,
  spillways: sampleSpillways,
  capacityCurve: sampleCapacityCurve,
  waterLevel: 160,
  validationResults: [],
  selectedVillageId: null,
  showContourLines: true,
  showSubmergedArea: true,
  showSpillways: true,
  previousConclusion: null,
  changeRecords: [],
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  interpolationInfo: null,

  setTerrain: (terrain) => {
    set({ terrain });
    get().validateData();
    get().checkChanges();
  },

  setWaterLevel: (level) => {
    set({ waterLevel: level });
    get().validateData();
  },

  addVillage: (village) => {
    const { villages } = get();
    set({ villages: [...villages, village] });
    get().validateData();
    get().checkChanges();
  },

  removeVillage: (id) => {
    const { villages } = get();
    set({ villages: villages.filter((v) => v.id !== id) });
    get().validateData();
    get().checkChanges();
  },

  updateVillage: (id, updates) => {
    const { villages } = get();
    set({
      villages: villages.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    });
    get().validateData();
    get().checkChanges();
  },

  setSelectedVillageId: (id) => set({ selectedVillageId: id }),
  toggleContourLines: () => set((s) => ({ showContourLines: !s.showContourLines })),
  toggleSubmergedArea: () => set((s) => ({ showSubmergedArea: !s.showSubmergedArea })),
  toggleSpillways: () => set((s) => ({ showSpillways: !s.showSpillways })),
  toggleLeftPanel: () => set((s) => ({ leftPanelCollapsed: !s.leftPanelCollapsed })),
  toggleRightPanel: () => set((s) => ({ rightPanelCollapsed: !s.rightPanelCollapsed })),

  validateData: () => {
    const { terrain, villages, capacityCurve, waterLevel } = get();
    const results = runAllValidations(terrain, villages, capacityCurve, waterLevel);
    set({ validationResults: results });
  },

  computeConclusion: () => {
    const { terrain, villages, waterLevel } = get();
    return buildConclusion(terrain, villages, waterLevel)!;
  },

  checkChanges: () => {
    const { terrain, villages, waterLevel, previousConclusion } = get();
    const current = buildConclusion(terrain, villages, waterLevel);
    if (!current || !previousConclusion) {
      if (current) set({ previousConclusion: current });
      return;
    }
    const records: ChangeRecord[] = [];
    const now = new Date().toISOString();
    if (current.minElevation !== previousConclusion.minElevation) {
      records.push({ field: '最低高程', oldValue: `${previousConclusion.minElevation}m`, newValue: `${current.minElevation}m`, timestamp: now });
    }
    if (current.maxElevation !== previousConclusion.maxElevation) {
      records.push({ field: '最高高程', oldValue: `${previousConclusion.maxElevation}m`, newValue: `${current.maxElevation}m`, timestamp: now });
    }
    if (current.submergedAreaAtCurrentLevel !== previousConclusion.submergedAreaAtCurrentLevel) {
      records.push({ field: '当前水位淹没面积', oldValue: `${previousConclusion.submergedAreaAtCurrentLevel}m²`, newValue: `${current.submergedAreaAtCurrentLevel}m²`, timestamp: now });
    }
    if (current.capacityAtCurrentLevel !== previousConclusion.capacityAtCurrentLevel) {
      records.push({ field: '当前水位库容', oldValue: `${previousConclusion.capacityAtCurrentLevel}万m³`, newValue: `${current.capacityAtCurrentLevel}万m³`, timestamp: now });
    }
    const oldRisk = previousConclusion.villagesAtRisk.join('、');
    const newRisk = current.villagesAtRisk.join('、');
    if (oldRisk !== newRisk) {
      records.push({ field: '受威胁村庄', oldValue: oldRisk || '无', newValue: newRisk || '无', timestamp: now });
    }
    set({ previousConclusion: current, changeRecords: [...records, ...get().changeRecords] });
  },
}));
