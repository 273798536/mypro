import { create } from "zustand";
import type {
  HullParams,
  LoadItem,
  InclinationRecord,
  VerificationResult,
  CgModificationImpact,
} from "@/types";
import { batchVerify, generateId } from "@/utils/verification";
import { getSampleData } from "@/utils/sampleData";

interface AppState {
  hulls: HullParams[];
  loads: LoadItem[];
  inclinations: InclinationRecord[];
  results: VerificationResult[];
  impacts: CgModificationImpact[];
  verified: boolean;

  addHull: (hull: HullParams) => void;
  updateHull: (id: string, updates: Partial<HullParams>) => void;
  removeHull: (id: string) => void;

  addLoad: (load: LoadItem) => void;
  updateLoad: (id: string, updates: Partial<LoadItem>) => void;
  removeLoad: (id: string) => void;

  addInclination: (inc: InclinationRecord) => void;
  updateInclination: (id: string, updates: Partial<InclinationRecord>) => void;
  removeInclination: (id: string) => void;

  loadSampleData: () => void;
  runVerification: () => void;
  clearAll: () => void;

  importData: (data: {
    hulls?: HullParams[];
    loads?: LoadItem[];
    inclinations?: InclinationRecord[];
  }) => void;
}

export const useStore = create<AppState>((set, get) => ({
  hulls: [],
  loads: [],
  inclinations: [],
  results: [],
  impacts: [],
  verified: false,

  addHull: (hull) =>
    set((s) => ({ hulls: [...s.hulls, hull], verified: false })),

  updateHull: (id, updates) =>
    set((s) => ({
      hulls: s.hulls.map((h) => (h.id === id ? { ...h, ...updates } : h)),
      verified: false,
    })),

  removeHull: (id) =>
    set((s) => ({
      hulls: s.hulls.filter((h) => h.id !== id),
      loads: s.loads.filter((l) => l.hullId !== id),
      inclinations: s.inclinations.filter((i) => i.hullId !== id),
      verified: false,
    })),

  addLoad: (load) =>
    set((s) => ({ loads: [...s.loads, load], verified: false })),

  updateLoad: (id, updates) =>
    set((s) => ({
      loads: s.loads.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      verified: false,
    })),

  removeLoad: (id) =>
    set((s) => ({
      loads: s.loads.filter((l) => l.id !== id),
      verified: false,
    })),

  addInclination: (inc) =>
    set((s) => ({
      inclinations: [...s.inclinations, inc],
      verified: false,
    })),

  updateInclination: (id, updates) =>
    set((s) => ({
      inclinations: s.inclinations.map((i) =>
        i.id === id ? { ...i, ...updates } : i
      ),
      verified: false,
    })),

  removeInclination: (id) =>
    set((s) => ({
      inclinations: s.inclinations.filter((i) => i.id !== id),
      verified: false,
    })),

  loadSampleData: () => {
    const data = getSampleData();
    set({
      hulls: data.hulls,
      loads: data.loads,
      inclinations: data.inclinations,
      results: [],
      impacts: [],
      verified: false,
    });
  },

  runVerification: () => {
    const { hulls, loads, inclinations } = get();
    const { results, impacts } = batchVerify(hulls, loads, inclinations);
    set({ results, impacts, verified: true });
  },

  clearAll: () =>
    set({
      hulls: [],
      loads: [],
      inclinations: [],
      results: [],
      impacts: [],
      verified: false,
    }),

  importData: (data) =>
    set((s) => ({
      hulls: [...s.hulls, ...(data.hulls ?? [])],
      loads: [...s.loads, ...(data.loads ?? [])],
      inclinations: [...s.inclinations, ...(data.inclinations ?? [])],
      verified: false,
    })),
}));

export function createEmptyHull(): HullParams {
  return {
    id: generateId(),
    source: "input",
    name: "",
    length: 0,
    beam: 0,
    depth: 0,
    draft: 0,
    displacement: 0,
    cgX: 0,
    cgY: 0,
    cgZ: 0,
    cgModified: false,
    density: 1.025,
    densityUnit: "salt",
    remark: "",
  };
}

export function createEmptyLoad(hullId: string): LoadItem {
  return {
    id: generateId(),
    hullId,
    name: "",
    weight: 0,
    positionX: 0,
    positionY: 0,
    positionZ: 0,
  };
}

export function createEmptyInclination(hullId: string): InclinationRecord {
  return {
    id: generateId(),
    hullId,
    rollAngle: 0,
    pitchAngle: 0,
    measuredAt: new Date().toISOString(),
    source: "manual",
  };
}
