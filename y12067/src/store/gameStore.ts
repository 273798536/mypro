import { create } from "zustand";
import type {
  CrowdParticle,
  ExitFlowInfo,
  GameEvent,
  ScoreDetail,
  Operation,
  GameSnapshot,
  Scenario,
} from "@/types";
import { cleanScenario, initCrowdParticles, spawnLateCrowd } from "@/engine/dataCleaner";
import { simulateStep, applyBroadcast, applyElevatorControl, applyExitRedirect } from "@/engine/simulation";
import { calculateScore } from "@/engine/scoring";
import { createSnapshot } from "@/engine/replay";
import { scenarios as rawScenarios } from "@/data/scenarios";

interface GameStore {
  scenario: Scenario | null;
  crowdState: CrowdParticle[];
  exitFlows: ExitFlowInfo[];
  evacuated: number;
  totalPeople: number;
  elapsed: number;
  running: boolean;
  finished: boolean;
  events: GameEvent[];
  score: ScoreDetail;
  operations: Operation[];
  snapshots: GameSnapshot[];
  elevatorStates: Record<string, boolean>;
  broadcastAreas: string[];
  congestionStart: Record<string, number>;
  stepNumber: number;
  spawnedGroups: Set<string>;

  loadScenario: (scenarioId: string) => void;
  startGame: () => void;
  tick: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  sendBroadcast: (floorId: string, targetExitId: string) => void;
  toggleElevator: (elevatorId: string, disable: boolean) => void;
  redirectExit: (floorId: string, fromExitId: string, toExitId: string) => void;
  finishGame: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  scenario: null,
  crowdState: [],
  exitFlows: [],
  evacuated: 0,
  totalPeople: 0,
  elapsed: 0,
  running: false,
  finished: false,
  events: [],
  score: { total: 100, deductions: [] },
  operations: [],
  snapshots: [],
  elevatorStates: {},
  broadcastAreas: [],
  congestionStart: {},
  stepNumber: 0,
  spawnedGroups: new Set(),

  loadScenario: (scenarioId: string) => {
    const raw = rawScenarios.find((s) => s.id === scenarioId);
    if (!raw) return;
    const scenario = cleanScenario(raw);
    const crowdState = initCrowdParticles(scenario.crowdGroups);
    const totalPeople = scenario.crowdGroups.reduce((sum, g) => sum + g.count, 0);
    const elevatorStates: Record<string, boolean> = {};
    scenario.floors.forEach((f) =>
      f.elevators.forEach((e) => { elevatorStates[e.id] = true; })
    );
    const spawnedGroups = new Set<string>();
    scenario.crowdGroups
      .filter((g) => (g.arrivalTime ?? 0) <= 0)
      .forEach((g) => spawnedGroups.add(g.id));

    set({
      scenario,
      crowdState,
      exitFlows: [],
      evacuated: 0,
      totalPeople,
      elapsed: 0,
      running: false,
      finished: false,
      events: [],
      score: { total: 100, deductions: [] },
      operations: [],
      snapshots: [],
      elevatorStates,
      broadcastAreas: [],
      congestionStart: {},
      stepNumber: 0,
      spawnedGroups,
    });
  },

  startGame: () => set({ running: true }),

  tick: () => {
    const state = get();
    if (!state.running || state.finished || !state.scenario) return;

    const newElapsed = state.elapsed + 1;
    const newStep = state.stepNumber + 1;

    const newParticles = spawnLateCrowd(
      state.scenario.crowdGroups,
      newElapsed,
      new Set(state.spawnedGroups)
    );
    const allParticles = [...state.crowdState, ...newParticles];
    const newSpawnedGroups = new Set(state.spawnedGroups);
    state.scenario.crowdGroups.forEach((g) => {
      if ((g.arrivalTime ?? 0) > 0 && Math.abs(newElapsed - g.arrivalTime!) <= 0.5) {
        newSpawnedGroups.add(g.id);
      }
    });

    const result = simulateStep(
      allParticles,
      state.scenario.floors,
      newElapsed,
      state.elevatorStates,
      state.broadcastAreas,
      state.congestionStart,
      newStep
    );

    const allDeductions = [
      ...state.score.deductions,
      ...result.deductions,
    ];
    const newScore = calculateScore(100, allDeductions);
    const allEvents = [...state.events, ...result.events];
    const totalEvacuated = state.evacuated + result.evacuated;

    const snapshot = createSnapshot(
      newStep,
      newElapsed,
      result.particles,
      result.exitFlows,
      totalEvacuated,
      allEvents,
      newScore,
      state.operations,
      state.elevatorStates,
      state.broadcastAreas
    );

    const isFinished =
      newElapsed >= (state.scenario.timeLimit) ||
      totalEvacuated >= state.totalPeople;

    set({
      crowdState: result.particles,
      exitFlows: result.exitFlows,
      evacuated: totalEvacuated,
      elapsed: newElapsed,
      stepNumber: newStep,
      events: allEvents,
      score: newScore,
      snapshots: [...state.snapshots, snapshot],
      congestionStart: result.congestionStart,
      spawnedGroups: newSpawnedGroups,
      finished: isFinished,
      running: !isFinished,
    });
  },

  pauseGame: () => set({ running: false }),
  resumeGame: () => set({ running: true }),

  sendBroadcast: (floorId: string, targetExitId: string) => {
    const state = get();
    if (!state.scenario || state.finished) return;

    const updatedCrowd = applyBroadcast(
      state.crowdState,
      floorId,
      targetExitId,
      state.scenario.floors
    );

    const operation: Operation = {
      step: state.stepNumber + 1,
      timestamp: state.elapsed,
      type: "broadcast",
      target: floorId,
      params: { targetExitId },
      crowdSnapshot: updatedCrowd.map((p) => ({ ...p })),
      scoreDelta: 0,
    };

    const newBroadcastAreas = state.broadcastAreas.includes(floorId)
      ? state.broadcastAreas
      : [...state.broadcastAreas, floorId];

    set({
      crowdState: updatedCrowd,
      operations: [...state.operations, operation],
      broadcastAreas: newBroadcastAreas,
    });
  },

  toggleElevator: (elevatorId: string, disable: boolean) => {
    const state = get();
    if (!state.scenario || state.finished) return;

    const updatedCrowd = applyElevatorControl(
      state.crowdState,
      elevatorId,
      disable,
      state.scenario.floors
    );

    const operation: Operation = {
      step: state.stepNumber + 1,
      timestamp: state.elapsed,
      type: "elevator_control",
      target: elevatorId,
      params: { disable },
      crowdSnapshot: updatedCrowd.map((p) => ({ ...p })),
      scoreDelta: 0,
    };

    set({
      crowdState: updatedCrowd,
      operations: [...state.operations, operation],
      elevatorStates: { ...state.elevatorStates, [elevatorId]: !disable },
    });
  },

  redirectExit: (floorId: string, fromExitId: string, toExitId: string) => {
    const state = get();
    if (!state.scenario || state.finished) return;

    const updatedCrowd = applyExitRedirect(
      state.crowdState,
      floorId,
      fromExitId,
      toExitId,
      state.scenario.floors
    );

    const operation: Operation = {
      step: state.stepNumber + 1,
      timestamp: state.elapsed,
      type: "exit_redirect",
      target: floorId,
      params: { fromExitId, toExitId },
      crowdSnapshot: updatedCrowd.map((p) => ({ ...p })),
      scoreDelta: 0,
    };

    set({
      crowdState: updatedCrowd,
      operations: [...state.operations, operation],
    });
  },

  finishGame: () => set({ finished: true, running: false }),
  resetGame: () => {
    const state = get();
    if (state.scenario) {
      get().loadScenario(state.scenario.id);
    }
  },
}));
