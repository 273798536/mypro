import { RainfallCard, ScenarioData, RoundDecision, RoundResult } from '@/types/game';

const RAINFALL_COEFF = 0.08;
const OUTFLOW_COEFF = 15;
const BASE_LEVEL = 20;
const EVAPORATION = 0.2;
const LEVEL_DRAIN_FACTOR = 0.04;
const SURGE_FACTOR = 0.5;

export function simulateRound(
  scenario: ScenarioData,
  currentUpstreamLevel: number,
  currentDownstreamFlow: number,
  decision: RoundDecision,
  activeCards: RainfallCard[],
  allResults: RoundResult[],
  previousGateOpen: number,
): { upstreamLevel: number; downstreamFlow: number } {
  const rainfallRise = activeCards.reduce(
    (sum, card) => sum + card.rainfallIntensity * RAINFALL_COEFF,
    0,
  );

  const headPressure = Math.max(currentUpstreamLevel - BASE_LEVEL, 0);

  const gateOutflow =
    (decision.gateOpenPercent / 100) * OUTFLOW_COEFF * headPressure;

  const gateIncrease = Math.max(decision.gateOpenPercent - previousGateOpen, 0);
  const surgeFlow = (gateIncrease / 100) * SURGE_FACTOR * OUTFLOW_COEFF * headPressure;

  const totalOutflow = gateOutflow + surgeFlow;

  const levelDrain = gateOutflow * LEVEL_DRAIN_FACTOR;

  const newUpstreamLevel = Math.max(
    currentUpstreamLevel + rainfallRise - levelDrain - EVAPORATION,
    0,
  );

  const newDownstreamFlow = Math.max(
    scenario.initialState.downstreamBaseFlow + totalOutflow,
    0,
  );

  return {
    upstreamLevel: Math.min(newUpstreamLevel, scenario.initialState.reservoirCapacity),
    downstreamFlow: newDownstreamFlow,
  };
}

export function getActiveRainfallCards(
  cards: RainfallCard[],
  round: number,
): RainfallCard[] {
  return cards.filter(
    (card) => round >= card.arrivalOrder && round < card.arrivalOrder + card.duration,
  );
}

export function getArrivedRainfallCards(
  cards: RainfallCard[],
  round: number,
): RainfallCard[] {
  return cards.filter((card) => card.arrivalOrder <= round);
}

export function calculateUpstreamRisk(
  upstreamLevel: number,
  capacity: number,
): number {
  const ratio = upstreamLevel / capacity;
  if (ratio < 0.7) return 0;
  if (ratio < 0.85) return ((ratio - 0.7) / 0.15) * 40;
  if (ratio < 0.95) return 40 + ((ratio - 0.85) / 0.1) * 40;
  return 80 + ((ratio - 0.95) / 0.05) * 20;
}

export function calculateDownstreamRisk(
  downstreamFlow: number,
  safeThreshold: number,
): number {
  const ratio = downstreamFlow / safeThreshold;
  if (ratio < 0.6) return 0;
  if (ratio < 0.8) return ((ratio - 0.6) / 0.2) * 30;
  if (ratio < 1.0) return 30 + ((ratio - 0.8) / 0.2) * 40;
  return 70 + Math.min((ratio - 1.0) / 0.5, 1) * 30;
}

export function calculateWarningDelayRisk(
  warningIssued: boolean,
  warningRound: number | null,
  peakRound: number,
  totalRounds: number,
): number {
  if (!warningIssued || warningRound === null) return 80;
  const lead = peakRound - warningRound;
  if (lead >= 2) return 0;
  if (lead === 1) return 30;
  if (lead === 0) return 60;
  return 80;
}

export function findPeakDownstreamRound(results: RoundResult[]): number {
  let maxFlow = 0;
  let peakRound = 1;
  for (const r of results) {
    if (r.downstreamFlow > maxFlow) {
      maxFlow = r.downstreamFlow;
      peakRound = r.round;
    }
  }
  return peakRound;
}
