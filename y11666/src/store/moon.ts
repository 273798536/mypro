import { create } from "zustand";
import type { MoonStore, RoutePoint, EnergyState, HistoryEntry } from "@/types";
import { generateSamples, generateCommWindows } from "@/utils/generate";
import { computeEnergy } from "@/utils/energy";
import { terrainHeight } from "@/utils/terrain";

const initialSamples = generateSamples(7);
const initialComm = generateCommWindows(11);

const initialEnergy: EnergyState = {
  battery: 100,
  weight: 0,
  shadowDepth: 0,
  shadowCost: 0,
  commMissed: 0,
  commSuccess: 0,
  overload: false,
  failed: false,
  failureReason: null,
};

const TERRAIN_SEED = 1;

export const useMoonStore = create<MoonStore>((set, get) => ({
  terrainSeed: TERRAIN_SEED,
  route: [],
  samples: initialSamples,
  commWindows: initialComm,
  energy: initialEnergy,
  sun: { angle: 45, intensity: 1 },
  filters: {
    showRock: true,
    showSoil: true,
    showIce: true,
    showComm: true,
    shadowSensitivity: 1,
  },
  history: [],
  replay: { playing: false, step: 0, speed: 1 },

  setRoute: (r) => {
    set({ route: r });
    get().recompute();
  },

  appendRoutePoint: (p) => {
    const next = [...get().route, p];
    set({ route: next });
    get().recompute();
  },

  popRoutePoint: () => {
    const next = get().route.slice(0, -1);
    set({ route: next });
    get().recompute();
  },

  resetRoute: () => {
    set({ route: [], energy: initialEnergy });
    get().pushHistory("重置路线", "reset");
  },

  setSun: (s) => {
    set({ sun: { ...get().sun, ...s } });
    get().recompute();
    get().pushHistory(`调整太阳角度至 ${get().sun.angle.toFixed(0)}°`, "sun");
  },

  setFilters: (f) => set({ filters: { ...get().filters, ...f } }),

  setEnergy: (e) => set({ energy: e }),

  collectSample: (id) => {
    const samples = get().samples.map((s) =>
      s.id === id ? { ...s, collected: true } : s
    );
    const added = samples.find((s) => s.id === id)?.weight ?? 0;
    set({ samples });
    get().recompute(added);
    get().pushHistory(`采集样本 ${id} +${added}kg`, "collect");
  },

  useComm: (id, ok) => {
    const comm = get().commWindows.map((c) =>
      c.id === id ? { ...c, used: true } : c
    );
    const energy = { ...get().energy };
    if (ok) energy.commSuccess += 1;
    else energy.commMissed += 1;
    set({ commWindows: comm, energy });
    get().pushHistory(
      ok ? `通讯窗口 ${id} 成功` : `错过通讯窗口 ${id}`,
      ok ? "comm_ok" : "comm_miss"
    );
  },

  pushHistory: (note, action) => {
    const state = get();
    const entry: HistoryEntry = {
      id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: Date.now(),
      action,
      route: state.route.map((p) => ({ ...p })),
      energy: { ...state.energy },
      sun: { ...state.sun },
      samples: state.samples.map((s) => ({ ...s })),
      commWindows: state.commWindows.map((c) => ({ ...c })),
      note,
    };
    set({ history: [...state.history, entry] });
  },

  setReplay: (r) => set({ replay: { ...get().replay, ...r } }),

  resetAll: () => {
    set({
      route: [],
      samples: generateSamples(7),
      commWindows: generateCommWindows(11),
      energy: initialEnergy,
      sun: { angle: 45, intensity: 1 },
      history: [],
      replay: { playing: false, step: 0, speed: 1 },
    });
    get().pushHistory("初始化探索", "init");
  },

  recompute: (extraWeight = 0) => {
    const state = get();
    const weight =
      state.samples.filter((s) => s.collected).reduce((t, s) => t + s.weight, 0) +
      extraWeight;
    const report = computeEnergy(
      state.route,
      TERRAIN_SEED,
      state.sun,
      weight,
      state.filters.shadowSensitivity,
      100
    );
    const overload = weight > 50;
    const energy: EnergyState = {
      battery: report.finalBattery,
      weight,
      shadowDepth: report.shadowSegments,
      shadowCost: report.totalShadowCost,
      commMissed: state.energy.commMissed,
      commSuccess: state.energy.commSuccess,
      overload,
      failed:
        report.failed ||
        overload ||
        state.energy.commMissed >= 2,
      failureReason:
        report.failureReason ??
        overload
          ? "样本超载未解决"
          : state.energy.commMissed >= 2
            ? "错过通讯窗口≥2"
            : null,
    };
    set({ energy });
  },
}));

export function snapToTerrain(x: number, z: number, seed = TERRAIN_SEED): RoutePoint {
  return { x, z, y: terrainHeight(x, z, seed), idx: -1 };
}
