import { create } from 'zustand';
import type {
  Planet,
  Spacecraft,
  TransferWindow,
  GameStep,
  Anomaly,
  BadRow,
  GameStateSnapshot,
  GamePhase,
  StepResultType,
} from '@/types';
import {
  computeTransferWindows,
  computeMissedWindow,
  checkOrbitIntersection,
  advancePlanets,
  hohmannTransferCost,
  calculateScoreDelta,
} from '@/engine/orbitalModel';
import { consumeFuel, stationKeepingCost } from '@/engine/fuelSystem';
import { checkWindowMissed, adjustedFuelCost } from '@/engine/windowChecker';
import { parseOrbitData, parseFuelBarData, parseMissionLogData } from '@/engine/dataParser';
import {
  ORBIT_DATA_RAW,
  FUEL_BAR_RAW,
  MISSION_LOG_RAW,
  PLANET_COLORS,
  PLANET_SIZES,
  INITIAL_FUEL,
  MISSION_SEQUENCE,
  TARGET_ORBIT,
} from '@/data/scenarioData';

function generatePlanets(): Planet[] {
  const { orbitEntries, badRows: orbitBadRows } = parseOrbitData(ORBIT_DATA_RAW);
  const planets: Planet[] = orbitEntries.map(e => ({
    id: e.id,
    name: e.name,
    orbitalRadius: e.radius,
    angularSpeed: e.speed,
    currentAngle: Math.random() * Math.PI * 2,
    color: PLANET_COLORS[e.id] || '#888888',
    size: PLANET_SIZES[e.id] || 6,
  }));
  return planets;
}

function collectBadRows(): BadRow[] {
  const orbitResult = parseOrbitData(ORBIT_DATA_RAW);
  const fuelResult = parseFuelBarData(FUEL_BAR_RAW);
  const logResult = parseMissionLogData(MISSION_LOG_RAW);
  return [...orbitResult.badRows, ...fuelResult.badRows, ...logResult.badRows];
}

function createInitialSpacecraft(planets: Planet[]): Spacecraft {
  const startPlanet = planets.find(p => p.id === 'mercury') || planets[0];
  return {
    id: 'sc-1',
    fuel: INITIAL_FUEL,
    maxFuel: INITIAL_FUEL,
    currentOrbitRadius: startPlanet.orbitalRadius,
    currentAngle: startPlanet.currentAngle,
    status: 'idle',
    targetOrbitRadius: null,
    transferProgress: 0,
  };
}

interface GameStore {
  phase: GamePhase;
  currentStep: number;
  score: number;
  planets: Planet[];
  spacecraft: Spacecraft;
  steps: GameStep[];
  anomalies: Anomaly[];
  badRows: BadRow[];
  history: GameStateSnapshot[];
  availableWindows: TransferWindow[];
  selectedWindowId: string | null;
  currentTargetIndex: number;
  reviewerFilter: string;
  missionComplete: boolean;

  initGame: () => void;
  selectWindow: (windowId: string) => void;
  executeTransfer: () => void;
  skipTurn: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  goToSettlement: () => void;
  setReviewerFilter: (filter: string) => void;
  restoreSnapshot: (stepIndex: number) => void;
  setPhase: (phase: GamePhase) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'setup',
  currentStep: 0,
  score: 0,
  planets: [],
  spacecraft: {
    id: 'sc-1',
    fuel: INITIAL_FUEL,
    maxFuel: INITIAL_FUEL,
    currentOrbitRadius: 80,
    currentAngle: 0,
    status: 'idle',
    targetOrbitRadius: null,
    transferProgress: 0,
  },
  steps: [],
  anomalies: [],
  badRows: [],
  history: [],
  availableWindows: [],
  selectedWindowId: null,
  currentTargetIndex: 0,
  reviewerFilter: 'all',
  missionComplete: false,

  initGame: () => {
    const planets = generatePlanets();
    const spacecraft = createInitialSpacecraft(planets);
    const badRows = collectBadRows();

    const currentTargetId = MISSION_SEQUENCE[0];
    const targetPlanet = planets.find(p => p.id === currentTargetId);
    const windows = targetPlanet
      ? computeTransferWindows(spacecraft, targetPlanet, planets, 0)
      : [];

    set({
      phase: 'playing',
      currentStep: 0,
      score: 0,
      planets,
      spacecraft,
      steps: [],
      anomalies: [],
      badRows,
      history: [
        {
          stepIndex: 0,
          planets: [...planets],
          spacecraft: { ...spacecraft },
          score: 0,
          fuelAtStep: spacecraft.fuel,
        },
      ],
      availableWindows: windows,
      selectedWindowId: null,
      currentTargetIndex: 0,
      missionComplete: false,
    });
  },

  selectWindow: (windowId: string) => {
    set({ selectedWindowId: windowId });
  },

  executeTransfer: () => {
    const state = get();
    if (state.phase !== 'playing' || !state.selectedWindowId) return;

    const selectedWindow = state.availableWindows.find(
      w => w.id === state.selectedWindowId
    );
    if (!selectedWindow) return;

    const targetPlanet = state.planets.find(
      p => p.id === selectedWindow.targetPlanetId
    );
    if (!targetPlanet) return;

    const actualFuelCost = adjustedFuelCost(selectedWindow, state.currentStep);
    const windowAnomaly = checkWindowMissed(selectedWindow, state.currentStep);
    const { spacecraft: updatedSC, anomaly: fuelAnomaly } = consumeFuel(
      state.spacecraft,
      actualFuelCost
    );
    const orbitIntersect = checkOrbitIntersection(
      state.spacecraft,
      targetPlanet.orbitalRadius,
      state.planets
    );

    let resultType: StepResultType = 'success';
    let anomaly: Anomaly | null = null;
    let newSC = { ...updatedSC };

    if (windowAnomaly) {
      resultType = 'window_missed';
      anomaly = { ...windowAnomaly, stepIndex: state.currentStep };
    } else if (fuelAnomaly) {
      resultType = 'fuel_insufficient';
      anomaly = { ...fuelAnomaly, stepIndex: state.currentStep };
    } else if (orbitIntersect) {
      resultType = 'orbit_intersect';
      anomaly = {
        id: `anomaly-orbit-${Date.now()}`,
        type: 'orbit_intersect',
        description: `轨道相交误判：转移轨道与${targetPlanet.name}轨道存在交叉风险`,
        stepIndex: state.currentStep,
        isResolved: false,
      };
    }

    if (resultType === 'success') {
      newSC.currentOrbitRadius = targetPlanet.orbitalRadius;
      newSC.currentAngle = targetPlanet.currentAngle;
      newSC.status = 'idle';
      newSC.targetOrbitRadius = null;
    } else if (resultType === 'window_missed') {
      newSC.currentAngle += 0.5;
      newSC.status = 'idle';
    } else {
      newSC.status = resultType === 'fuel_insufficient' ? 'stranded' : 'idle';
    }

    const baseCost = hohmannTransferCost(
      state.spacecraft.currentOrbitRadius,
      targetPlanet.orbitalRadius
    );
    const scoreDelta = calculateScoreDelta(
      resultType,
      selectedWindow.timeOffset,
      actualFuelCost,
      baseCost
    );

    const step: GameStep = {
      stepIndex: state.currentStep,
      selectedWindowId: selectedWindow.id,
      targetPlanetName: selectedWindow.targetPlanetName,
      fuelConsumed: actualFuelCost,
      fuelRemaining: newSC.fuel,
      scoreDelta,
      resultType,
      anomalyType: anomaly?.type || null,
      timeOffset: selectedWindow.timeOffset,
      description:
        resultType === 'success'
          ? `成功转移至${targetPlanet.name}轨道，消耗燃料 ${actualFuelCost.toFixed(1)}`
          : resultType === 'window_missed'
          ? `窗口错过！无法到达${targetPlanet.name}，燃料浪费 ${actualFuelCost.toFixed(1)}`
          : resultType === 'fuel_insufficient'
          ? `燃料不足！无法完成至${targetPlanet.name}的转移`
          : `轨道相交风险！转移至${targetPlanet.name}存在碰撞危险`,
    };

    const newPlanets = advancePlanets(state.planets, 1);
    const nextTargetIndex =
      resultType === 'success' ? state.currentTargetIndex + 1 : state.currentTargetIndex;
    const missionComplete =
      MISSION_SEQUENCE[nextTargetIndex] === undefined ||
      (resultType === 'success' && MISSION_SEQUENCE[nextTargetIndex - 1] === TARGET_ORBIT);

    const nextTargetId = MISSION_SEQUENCE[nextTargetIndex];
    const nextTargetPlanet = newPlanets.find(p => p.id === nextTargetId);
    const nextWindows =
      nextTargetPlanet && !missionComplete
        ? computeTransferWindows(newSC, nextTargetPlanet, newPlanets, state.currentStep + 1)
        : [];
    const missedWindow =
      nextTargetPlanet && !missionComplete && nextWindows.length === 0
        ? [computeMissedWindow(newSC, nextTargetPlanet, state.currentStep + 1)]
        : [];

    const newAnomalies = anomaly ? [...state.anomalies, anomaly] : state.anomalies;

    set({
      currentStep: state.currentStep + 1,
      score: state.score + scoreDelta,
      planets: newPlanets,
      spacecraft: newSC,
      steps: [...state.steps, step],
      anomalies: newAnomalies,
      history: [
        ...state.history,
        {
          stepIndex: state.currentStep + 1,
          planets: [...newPlanets],
          spacecraft: { ...newSC },
          score: state.score + scoreDelta,
          fuelAtStep: newSC.fuel,
        },
      ],
      availableWindows: [...nextWindows, ...missedWindow],
      selectedWindowId: null,
      currentTargetIndex: nextTargetIndex,
      missionComplete,
      phase:
        missionComplete || newSC.status === 'stranded'
          ? 'finished'
          : state.phase,
    });
  },

  skipTurn: () => {
    const state = get();
    if (state.phase !== 'playing') return;

    const skipCost = stationKeepingCost(1);
    const { spacecraft: updatedSC, anomaly: fuelAnomaly } = consumeFuel(
      state.spacecraft,
      skipCost
    );

    const newPlanets = advancePlanets(state.planets, 1);
    const step: GameStep = {
      stepIndex: state.currentStep,
      selectedWindowId: 'skip',
      targetPlanetName: '—',
      fuelConsumed: skipCost,
      fuelRemaining: updatedSC.fuel,
      scoreDelta: -2,
      resultType: fuelAnomaly ? 'fuel_insufficient' : 'success',
      anomalyType: fuelAnomaly?.type || null,
      timeOffset: 0,
      description: `等待一回合，驻留消耗燃料 ${skipCost.toFixed(1)}`,
    };

    const nextTargetId = MISSION_SEQUENCE[state.currentTargetIndex];
    const nextTargetPlanet = newPlanets.find(p => p.id === nextTargetId);
    const nextWindows = nextTargetPlanet
      ? computeTransferWindows(updatedSC, nextTargetPlanet, newPlanets, state.currentStep + 1)
      : [];
    const missedWindow =
      nextTargetPlanet && nextWindows.length === 0
        ? [computeMissedWindow(updatedSC, nextTargetPlanet, state.currentStep + 1)]
        : [];

    const newAnomalies = fuelAnomaly
      ? [...state.anomalies, { ...fuelAnomaly, stepIndex: state.currentStep }]
      : state.anomalies;

    set({
      currentStep: state.currentStep + 1,
      score: state.score - 2,
      planets: newPlanets,
      spacecraft: { ...updatedSC, currentAngle: updatedSC.currentAngle + 0.03 },
      steps: [...state.steps, step],
      anomalies: newAnomalies,
      history: [
        ...state.history,
        {
          stepIndex: state.currentStep + 1,
          planets: [...newPlanets],
          spacecraft: { ...updatedSC },
          score: state.score - 2,
          fuelAtStep: updatedSC.fuel,
        },
      ],
      availableWindows: [...nextWindows, ...missedWindow],
      selectedWindowId: null,
      phase: updatedSC.status === 'stranded' ? 'finished' : state.phase,
    });
  },

  pauseGame: () => set({ phase: 'paused' }),
  resumeGame: () => set({ phase: 'playing' }),
  restartGame: () => {
    get().initGame();
  },
  goToSettlement: () => set({ phase: 'finished' }),

  setReviewerFilter: (filter: string) => set({ reviewerFilter: filter }),

  restoreSnapshot: (stepIndex: number) => {
    const state = get();
    const snapshot = state.history[stepIndex];
    if (!snapshot) return;

    const nextTargetIndex = Math.min(
      stepIndex,
      state.steps.filter(s => s.resultType === 'success').length
    );
    const nextTargetId = MISSION_SEQUENCE[nextTargetIndex];
    const nextTargetPlanet = snapshot.planets.find(p => p.id === nextTargetId);
    const windows = nextTargetPlanet
      ? computeTransferWindows(
          snapshot.spacecraft,
          nextTargetPlanet,
          snapshot.planets,
          stepIndex
        )
      : [];

    set({
      planets: snapshot.planets,
      spacecraft: snapshot.spacecraft,
      availableWindows: windows,
      selectedWindowId: null,
      currentTargetIndex: nextTargetIndex,
    });
  },

  setPhase: (phase: GamePhase) => set({ phase }),
}));
