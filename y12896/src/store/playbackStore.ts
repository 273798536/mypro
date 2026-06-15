import { create } from "zustand";
import type {
  Scenario,
  TideDataResponse,
  CalcResult,
  StrategyType,
  TimelinePoint,
  GlobalAlert,
  GateOverrideResponse,
  Report,
  GateStrategyPoint,
} from "../../shared/types";
import { api } from "@/lib/api";

export interface PlaybackState {
  scenario: Scenario | null;
  scenarios: Scenario[];
  tideData: TideDataResponse | null;
  calcResult: CalcResult | null;
  report: Report | null;
  strategy: StrategyType;
  timezone: string;
  customGates: GateStrategyPoint[];
  playbackIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  loading: boolean;
  error: string | null;
  latestOverride: GateOverrideResponse | null;
}

export interface PlaybackActions {
  init: () => Promise<void>;
  selectScenario: (id: string) => Promise<void>;
  setStrategy: (s: StrategyType) => Promise<void>;
  setTimezone: (tz: string) => Promise<void>;
  runCalculation: () => Promise<void>;
  generateReport: () => Promise<void>;
  setPlaybackIndex: (idx: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  applyGateOverride: (
    time: string,
    openingPercent: number,
    reason?: string
  ) => Promise<void>;
  getCurrentTimeline: () => TimelinePoint | null;
  getCurrentAlert: () => GlobalAlert | null;
  clearOverride: () => void;
}

export const usePlaybackStore = create<PlaybackState & PlaybackActions>((set, get) => ({
  scenario: null,
  scenarios: [],
  tideData: null,
  calcResult: null,
  report: null,
  strategy: "correct",
  timezone: "Asia/Shanghai",
  customGates: [],
  playbackIndex: 0,
  isPlaying: false,
  playbackSpeed: 1,
  loading: false,
  error: null,
  latestOverride: null,

  init: async () => {
    try {
      const scenarios = await api.listScenarios();
      set({ scenarios });
      if (scenarios.length > 0 && !get().scenario) {
        await get().selectScenario(scenarios[0].id);
      }
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  selectScenario: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const state = get();
      const scenario = state.scenarios.find((s) => s.id === id) || null;
      const tz = state.timezone;
      const tide = await api.getTideData(id, tz);
      set({ scenario, tideData: tide, playbackIndex: 0 });
      await get().runCalculation();
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  setStrategy: async (s: StrategyType) => {
    set({ strategy: s });
    await get().runCalculation();
  },

  setTimezone: async (tz: string) => {
    set({ timezone: tz });
    const state = get();
    if (state.scenario) {
      set({ loading: true });
      try {
        const tide = await api.getTideData(state.scenario.id, tz);
        set({ tideData: tide });
        await get().runCalculation();
      } catch (e) {
        set({ error: (e as Error).message });
      } finally {
        set({ loading: false });
      }
    }
  },

  runCalculation: async () => {
    const state = get();
    if (!state.scenario) return;
    try {
      const result = await api.calculate({
        scenarioId: state.scenario.id,
        strategy: state.strategy,
        customGates: state.strategy === "custom" ? state.customGates : undefined,
        timezone: state.timezone,
      });
      set({ calcResult: result });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  generateReport: async () => {
    const state = get();
    if (!state.scenario) return;
    set({ loading: true });
    try {
      const report = await api.getReport({
        scenarioId: state.scenario.id,
        strategy: state.strategy,
        customGates: state.strategy === "custom" ? state.customGates : undefined,
        timezone: state.timezone,
      });
      set({ report });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  setPlaybackIndex: (idx: number) => set({ playbackIndex: idx }),
  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed: number) => set({ playbackSpeed: speed }),

  applyGateOverride: async (time, openingPercent, reason) => {
    const state = get();
    if (!state.scenario) return;
    try {
      const res = await api.applyGateOverride(state.scenario.id, {
        time,
        openingPercent,
        reason,
      });
      set({ latestOverride: res });
      if (res.success) {
        const existing = state.customGates.findIndex((g) => g.time === time);
        const nextGates = [...state.customGates];
        if (existing >= 0) nextGates[existing] = { time, openingPercent };
        else nextGates.push({ time, openingPercent });
        set({ customGates: nextGates, strategy: "custom" });
        await get().runCalculation();
      }
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  getCurrentTimeline: () => {
    const state = get();
    if (!state.calcResult || state.calcResult.timeline.length === 0) return null;
    const idx = Math.min(state.playbackIndex, state.calcResult.timeline.length - 1);
    return state.calcResult.timeline[idx];
  },

  getCurrentAlert: () => {
    const state = get();
    if (!state.calcResult) return null;
    const t = state.getCurrentTimeline();
    if (!t) return null;
    return (
      state.calcResult.alerts.find(
        (a) => new Date(a.timestamp).getTime() === new Date(t.time).getTime()
      ) || null
    );
  },

  clearOverride: () => set({ latestOverride: null }),
}));
