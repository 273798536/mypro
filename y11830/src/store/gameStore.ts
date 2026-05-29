import { create } from 'zustand';
import {
  ScenarioData,
  RoundDecision,
  RoundResult,
  GameScore,
  FailureDiagnosis,
  GameStatus,
  GateOption,
  RainfallCard,
} from '@/types/game';
import {
  simulateRound,
  getActiveRainfallCards,
  getArrivedRainfallCards,
  calculateUpstreamRisk,
  calculateDownstreamRisk,
  findPeakDownstreamRound,
  calculateWarningDelayRisk,
} from '@/engine/waterSimulator';
import { calculateGameScore, diagnoseFailures } from '@/engine/riskScorer';

interface GameState {
  scenario: ScenarioData | null;
  status: GameStatus;
  currentRound: number;
  upstreamLevel: number;
  downstreamFlow: number;
  selectedGate: GateOption;
  warningIssuedThisRound: boolean;
  decisions: RoundDecision[];
  results: RoundResult[];
  score: GameScore | null;
  diagnoses: FailureDiagnosis[];
  replayRound: number;

  loadScenario: (scenario: ScenarioData) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetGame: () => void;
  selectGate: (gate: GateOption) => void;
  toggleWarning: () => void;
  confirmRound: () => void;
  goToResult: () => void;
  setReplayRound: (round: number) => void;
  resetReplay: () => void;

  getArrivedCards: () => RainfallCard[];
  getActiveCards: () => RainfallCard[];
}

export const useGameStore = create<GameState>((set, get) => ({
  scenario: null,
  status: 'idle',
  currentRound: 1,
  upstreamLevel: 0,
  downstreamFlow: 0,
  selectedGate: 0,
  warningIssuedThisRound: false,
  decisions: [],
  results: [],
  score: null,
  diagnoses: [],
  replayRound: 0,

  loadScenario: (scenario: ScenarioData) => {
    set({
      scenario,
      status: 'idle',
      currentRound: 1,
      upstreamLevel: scenario.initialState.reservoirLevel,
      downstreamFlow: scenario.initialState.downstreamBaseFlow,
      selectedGate: scenario.initialState.gateOpenPercent as GateOption,
      warningIssuedThisRound: false,
      decisions: [],
      results: [],
      score: null,
      diagnoses: [],
      replayRound: 0,
    });
  },

  startGame: () => {
    const { scenario } = get();
    if (!scenario) return;
    set({ status: 'playing' });
  },

  pauseGame: () => set({ status: 'paused' }),
  resumeGame: () => set({ status: 'playing' }),

  resetGame: () => {
    const { scenario } = get();
    if (!scenario) return;
    set({
      status: 'idle',
      currentRound: 1,
      upstreamLevel: scenario.initialState.reservoirLevel,
      downstreamFlow: scenario.initialState.downstreamBaseFlow,
      selectedGate: scenario.initialState.gateOpenPercent as GateOption,
      warningIssuedThisRound: false,
      decisions: [],
      results: [],
      score: null,
      diagnoses: [],
      replayRound: 0,
    });
  },

  selectGate: (gate: GateOption) => set({ selectedGate: gate }),
  toggleWarning: () => set((s) => ({ warningIssuedThisRound: !s.warningIssuedThisRound })),

  confirmRound: () => {
    const { scenario, currentRound, upstreamLevel, downstreamFlow, selectedGate, warningIssuedThisRound, decisions, results } = get();
    if (!scenario) return;

    const decision: RoundDecision = {
      round: currentRound,
      gateOpenPercent: selectedGate,
      warningIssued: warningIssuedThisRound,
    };

    const activeCards = getActiveRainfallCards(scenario.rainfallCards, currentRound);

    const previousGateOpen = decisions.length > 0
      ? decisions[decisions.length - 1].gateOpenPercent
      : scenario.initialState.gateOpenPercent;

    const simResult = simulateRound(
      scenario,
      upstreamLevel,
      downstreamFlow,
      decision,
      activeCards,
      results,
      previousGateOpen,
    );

    const upstreamRisk = calculateUpstreamRisk(simResult.upstreamLevel, scenario.initialState.reservoirCapacity);
    const downstreamRisk = calculateDownstreamRisk(simResult.downstreamFlow, scenario.initialState.downstreamSafeThreshold);

    const peakRound = results.length > 0 ? findPeakDownstreamRound([...results, {
      round: currentRound,
      upstreamLevel: simResult.upstreamLevel,
      downstreamFlow: simResult.downstreamFlow,
      upstreamRisk,
      downstreamRisk,
      warningDelayRisk: 0,
      activeRainfallCards: activeCards,
    }]) : currentRound;

    const warningDelayRisk = calculateWarningDelayRisk(
      warningIssuedThisRound || decisions.some((d) => d.warningIssued),
      warningIssuedThisRound ? currentRound : decisions.find((d) => d.warningIssued)?.round ?? null,
      peakRound,
      scenario.totalRounds,
    );

    const roundResult: RoundResult = {
      round: currentRound,
      upstreamLevel: simResult.upstreamLevel,
      downstreamFlow: simResult.downstreamFlow,
      upstreamRisk,
      downstreamRisk,
      warningDelayRisk,
      activeRainfallCards: activeCards,
    };

    const newDecisions = [...decisions, decision];
    const newResults = [...results, roundResult];

    const isLastRound = currentRound >= scenario.totalRounds;

    if (isLastRound) {
      const score = calculateGameScore(scenario, newDecisions, newResults);
      const diagnoses = diagnoseFailures(scenario, newDecisions, newResults);
      set({
        decisions: newDecisions,
        results: newResults,
        upstreamLevel: simResult.upstreamLevel,
        downstreamFlow: simResult.downstreamFlow,
        status: 'finished',
        score,
        diagnoses,
        warningIssuedThisRound: false,
      });
    } else {
      set({
        decisions: newDecisions,
        results: newResults,
        currentRound: currentRound + 1,
        upstreamLevel: simResult.upstreamLevel,
        downstreamFlow: simResult.downstreamFlow,
        warningIssuedThisRound: false,
        selectedGate: selectedGate,
      });
    }
  },

  goToResult: () => {},

  setReplayRound: (round: number) => set({ replayRound: round }),
  resetReplay: () => set({ replayRound: 0 }),

  getArrivedCards: () => {
    const { scenario, currentRound } = get();
    if (!scenario) return [];
    return getArrivedRainfallCards(scenario.rainfallCards, currentRound);
  },

  getActiveCards: () => {
    const { scenario, currentRound } = get();
    if (!scenario) return [];
    return getActiveRainfallCards(scenario.rainfallCards, currentRound);
  },
}));
