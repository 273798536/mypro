import { create } from "zustand";
import type { DriftCalculation, PlannedWaypoint, TrajectoryPoint } from "@/types";
import { calculateDrift, type DriftCalcInput } from "@/utils/formulas";

interface DriftState {
  result: DriftCalculation | null;
  isCalculating: boolean;
  input: {
    actualTrajectory: TrajectoryPoint[];
    plannedRoute: PlannedWaypoint[];
    meteoAvailable: boolean;
    windReportDate: string;
    aisRawAvailable: boolean;
    aisTimeRange: string;
  };
  setInput: <K extends keyof DriftState["input"]>(key: K, value: DriftState["input"][K]) => void;
  setTrajectory: (points: TrajectoryPoint[]) => void;
  setPlanned: (waypoints: PlannedWaypoint[]) => void;
  run: () => void;
  reset: () => void;
}

const DEFAULT_PLANNED: PlannedWaypoint[] = [
  { name: "青岛港锚地", lat: 35.58, lng: 120.08 },
  { name: "A 区投喂起点", lat: 35.62, lng: 120.11 },
  { name: "A3 网箱中心", lat: 35.632, lng: 120.12 },
  { name: "返港点", lat: 35.645, lng: 120.148 },
];

function buildDefaultTrajectory(): TrajectoryPoint[] {
  const count = 28;
  const result: TrajectoryPoint[] = [];
  const start = { lat: 35.6, lng: 120.1 };
  const end = { lat: 35.65, lng: 120.15 };
  const driftFactor = 200;
  const startTime = new Date("2026-06-12T05:30:00Z").getTime();
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const noise = (Math.sin(i * 0.7) * driftFactor) / 111000;
    result.push({
      id: `demo-tp-${i}`,
      inspectionId: "demo",
      lat: Number((start.lat + (end.lat - start.lat) * t + noise).toFixed(6)),
      lng: Number((start.lng + (end.lng - start.lng) * t + noise * 0.7).toFixed(6)),
      timestamp: new Date(startTime + i * 5 * 60 * 1000).toISOString(),
      speedKnots: Number((4.5 + Math.sin(i * 0.5) * 1.2).toFixed(1)),
    });
  }
  return result;
}

export const useDriftStore = create<DriftState>((set, get) => ({
  result: null,
  isCalculating: false,
  input: {
    actualTrajectory: buildDefaultTrajectory(),
    plannedRoute: DEFAULT_PLANNED,
    meteoAvailable: true,
    windReportDate: "2026-06-12",
    aisRawAvailable: true,
    aisTimeRange: "2026-06-12 05:00-07:30",
  },
  setInput: (key, value) =>
    set((state) => ({ input: { ...state.input, [key]: value } })),
  setTrajectory: (points) =>
    set((state) => ({ input: { ...state.input, actualTrajectory: points } })),
  setPlanned: (waypoints) =>
    set((state) => ({ input: { ...state.input, plannedRoute: waypoints } })),
  run: () => {
    set({ isCalculating: true });
    setTimeout(() => {
      const inp = get().input;
      const calcInput: DriftCalcInput = {
        actualTrajectory: inp.actualTrajectory,
        plannedRoute: inp.plannedRoute,
        meteoAvailable: inp.meteoAvailable,
        windReportDate: inp.windReportDate,
        aisRawAvailable: inp.aisRawAvailable,
        aisTimeRange: inp.aisTimeRange,
      };
      set({ result: calculateDrift(calcInput), isCalculating: false });
    }, 600);
  },
  reset: () =>
    set({
      result: null,
      input: {
        actualTrajectory: buildDefaultTrajectory(),
        plannedRoute: DEFAULT_PLANNED,
        meteoAvailable: true,
        windReportDate: "2026-06-12",
        aisRawAvailable: true,
        aisTimeRange: "2026-06-12 05:00-07:30",
      },
    }),
}));
