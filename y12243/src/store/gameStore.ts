import { create } from 'zustand';
import type { Spacecraft, OrbitRing, FlightLog, MissionResult, Violation } from '@/types';
import { initialSpacecraft, initialOrbitRings, initialFlightLogs, initialMissionResults, initialViolations } from '@/data/mockData';
import { checkRules } from '@/utils/ruleEngine';

interface GameState {
  spacecraft: Spacecraft[];
  orbitRings: OrbitRing[];
  flightLogs: FlightLog[];
  missionResults: MissionResult[];
  violations: Violation[];
  windowCountdown: number;
  selectedSpacecraftId: string | null;
  selectedOrbitRingId: string | null;
  gamePhase: 'playing' | 'settled';
  currentViolations: Violation[];

  selectSpacecraft: (id: string | null) => void;
  selectOrbitRing: (id: string | null) => void;
  assignOrbit: (spacecraftId: string, orbitRingId: string) => void;
  unassignOrbit: (orbitRingId: string) => void;
  setWindowCountdown: (seconds: number) => void;
  settleMission: (spacecraftId: string) => void;
  resetGame: () => void;
  addFlightLog: (log: Omit<FlightLog, 'id'>) => void;
  getSpacecraftById: (id: string) => Spacecraft | undefined;
  getOrbitRingById: (id: string) => OrbitRing | undefined;
  getMissionResultBySpacecraft: (spacecraftId: string) => MissionResult | undefined;
  getViolationsByMissionResult: (missionResultId: string) => Violation[];
  getViolationsBySpacecraft: (spacecraftId: string) => Violation[];
  getOrbitRingsBySpacecraft: (spacecraftId: string) => OrbitRing[];
  getFlightLogsBySpacecraft: (spacecraftId: string) => FlightLog[];
  getFlightLogsByOrbitRing: (orbitRingId: string) => FlightLog[];
}

let nextId = 100;
function genId(prefix: string) {
  return `${prefix}-${String(nextId++).padStart(3, '0')}`;
}

export const useGameStore = create<GameState>((set, get) => ({
  spacecraft: initialSpacecraft,
  orbitRings: initialOrbitRings,
  flightLogs: initialFlightLogs,
  missionResults: initialMissionResults,
  violations: initialViolations,
  windowCountdown: 120,
  selectedSpacecraftId: null,
  selectedOrbitRingId: null,
  gamePhase: 'playing',
  currentViolations: [],

  selectSpacecraft: (id) => set({ selectedSpacecraftId: id }),
  selectOrbitRing: (id) => set({ selectedOrbitRingId: id }),

  assignOrbit: (spacecraftId, orbitRingId) => {
    const state = get();
    const sc = state.spacecraft.find(s => s.id === spacecraftId);
    const orb = state.orbitRings.find(o => o.id === orbitRingId);
    if (!sc || !orb) return;

    const assignedToThisSc = state.orbitRings.filter(o => o.assignedTo === spacecraftId);
    const isWindowClosed = state.windowCountdown <= 0;
    const violations = checkRules({
      spacecraft: sc,
      orbitRing: orb,
      assignedOrbits: assignedToThisSc,
      isWindowClosed,
    });

    const hasWindowMiss = violations.some(v => v.ruleType === 'window_rule');

    const newViolations: Violation[] = violations.map(v => ({
      id: genId('vio'),
      missionResultId: '',
      ...v,
    }));

    const now = new Date().toISOString();
    const newLog: FlightLog = {
      id: genId('fl'),
      spacecraftId,
      orbitRingId,
      eventType: hasWindowMiss ? 'window_miss' : 'allocation',
      description: hasWindowMiss
        ? `${sc.name}错过${orb.name}窗口后尝试分配`
        : `${sc.name}分配至${orb.name}`,
      timestamp: now,
      hasMissingField: false,
      isLateEntry: isWindowClosed,
      isNoteModified: false,
    };

    const fuelLog: FlightLog = {
      id: genId('fl'),
      spacecraftId,
      orbitRingId,
      eventType: 'fuel_settlement',
      description: `燃料结算：消耗${orb.fuelCost}单位，预算剩余${sc.fuelBudget - sc.fuelUsed - orb.fuelCost}`,
      timestamp: now,
      hasMissingField: false,
      isLateEntry: false,
      isNoteModified: false,
    };

    set(s => ({
      orbitRings: s.orbitRings.map(o =>
        o.id === orbitRingId ? { ...o, isAssigned: true, assignedTo: spacecraftId } : o
      ),
      spacecraft: s.spacecraft.map(sc =>
        sc.id === spacecraftId
          ? { ...sc, fuelUsed: sc.fuelUsed + orb.fuelCost, orbitCount: sc.orbitCount + 1 }
          : sc
      ),
      flightLogs: [...s.flightLogs, newLog, fuelLog],
      currentViolations: [...s.currentViolations, ...newViolations],
    }));
  },

  unassignOrbit: (orbitRingId) => {
    const state = get();
    const orb = state.orbitRings.find(o => o.id === orbitRingId);
    if (!orb || !orb.assignedTo) return;

    const sc = state.spacecraft.find(s => s.id === orb.assignedTo);
    if (!sc) return;

    set(s => ({
      orbitRings: s.orbitRings.map(o =>
        o.id === orbitRingId ? { ...o, isAssigned: false, assignedTo: undefined } : o
      ),
      spacecraft: s.spacecraft.map(sc =>
        sc.id === orb.assignedTo
          ? { ...sc, fuelUsed: Math.max(0, sc.fuelUsed - orb.fuelCost), orbitCount: Math.max(0, sc.orbitCount - 1) }
          : sc
      ),
    }));
  },

  setWindowCountdown: (seconds) => set({ windowCountdown: seconds }),

  settleMission: (spacecraftId) => {
    const state = get();
    const sc = state.spacecraft.find(s => s.id === spacecraftId);
    if (!sc) return;

    const assigned = state.orbitRings.filter(o => o.assignedTo === spacecraftId);
    const orbitScore = assigned.reduce((sum, o) => sum + o.thrustGain, 0);
    const fuelRemaining = sc.fuelBudget - sc.fuelUsed;
    const fuelScore = Math.round(fuelRemaining * 0.1);
    const violationPenalty = state.currentViolations
      .filter(v => !v.isOverridden)
      .reduce((sum, _, i) => sum + 10 * (i + 1), 0);
    const totalScore = Math.max(0, orbitScore + fuelScore - violationPenalty);

    const status: MissionResult['status'] = totalScore >= 60 ? 'success' : totalScore >= 30 ? 'partial' : 'failed';
    const missionId = genId('mr');

    const result: MissionResult = {
      id: missionId,
      spacecraftId,
      totalScore,
      orbitScore,
      fuelScore,
      status,
    };

    const violationsWithResult = state.currentViolations.map(v => ({
      ...v,
      missionResultId: missionId,
    }));

    set(s => ({
      missionResults: [...s.missionResults, result],
      violations: [...s.violations, ...violationsWithResult],
      currentViolations: [],
      gamePhase: 'settled',
    }));
  },

  resetGame: () => set({
    spacecraft: initialSpacecraft,
    orbitRings: initialOrbitRings,
    flightLogs: initialFlightLogs,
    missionResults: initialMissionResults,
    violations: initialViolations,
    windowCountdown: 120,
    selectedSpacecraftId: null,
    selectedOrbitRingId: null,
    gamePhase: 'playing',
    currentViolations: [],
  }),

  addFlightLog: (log) => set(s => ({
    flightLogs: [...s.flightLogs, { ...log, id: genId('fl') }],
  })),

  getSpacecraftById: (id) => get().spacecraft.find(s => s.id === id),
  getOrbitRingById: (id) => get().orbitRings.find(o => o.id === id),
  getMissionResultBySpacecraft: (spacecraftId) => get().missionResults.find(m => m.spacecraftId === spacecraftId),
  getViolationsByMissionResult: (missionResultId) => get().violations.filter(v => v.missionResultId === missionResultId),
  getViolationsBySpacecraft: (spacecraftId) => get().violations.filter(v => v.spacecraftId === spacecraftId),
  getOrbitRingsBySpacecraft: (spacecraftId) => get().orbitRings.filter(o => o.assignedTo === spacecraftId),
  getFlightLogsBySpacecraft: (spacecraftId) => get().flightLogs.filter(f => f.spacecraftId === spacecraftId),
  getFlightLogsByOrbitRing: (orbitRingId) => get().flightLogs.filter(f => f.orbitRingId === orbitRingId),
}));
