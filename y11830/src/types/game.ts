export interface RainfallCard {
  id: string;
  arrivalOrder: number;
  rainfallIntensity: number;
  duration: number;
  description: string;
}

export interface ScenarioData {
  id: string;
  name: string;
  description: string;
  initialState: {
    reservoirLevel: number;
    reservoirCapacity: number;
    gateOpenPercent: number;
    downstreamBaseFlow: number;
    downstreamSafeThreshold: number;
  };
  rainfallCards: RainfallCard[];
  totalRounds: number;
  passingScore: number;
  recommendedDecisions: RecommendedDecision[];
}

export interface RecommendedDecision {
  round: number;
  gateOpenPercent: number;
  warningIssued: boolean;
}

export interface RoundDecision {
  round: number;
  gateOpenPercent: number;
  warningIssued: boolean;
}

export interface RoundResult {
  round: number;
  upstreamLevel: number;
  downstreamFlow: number;
  upstreamRisk: number;
  downstreamRisk: number;
  warningDelayRisk: number;
  activeRainfallCards: RainfallCard[];
}

export interface GameScore {
  gateScore: number;
  warningScore: number;
  downstreamSafetyScore: number;
  totalScore: number;
  passed: boolean;
}

export interface FailureDiagnosis {
  round: number;
  issue: string;
  severity: 'high' | 'medium' | 'low';
  detail: string;
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished';

export type GateOption = 0 | 25 | 50 | 75 | 100;
