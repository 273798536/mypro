export type FundType = "股票型" | "混合型" | "债券型" | "货币型";
export type ActionType = "买入" | "卖出" | "持有";
export type RiskType = "行业集中" | "手续费漏扣" | "恐慌卖出";
export type GamePhase = "idle" | "playing" | "settlement" | "report";

export interface FundCard {
  fundId: string;
  name: string;
  industry: string;
  fundType: FundType;
  feeRate: number;
  navHistory: number[];
}

export interface NewsEvent {
  eventId: string;
  roundId: string;
  title: string;
  description: string;
  affectedIndustries: string[];
  impactRate: number;
}

export interface Round {
  roundId: string;
  roundNumber: number;
  eventId: string;
  marketDrawdown: number;
}

export interface RoundPosition {
  id: string;
  roundId: string;
  fundId: string;
  action: ActionType;
  shares: number;
  feeCharged: number;
  feeOmitted: boolean;
  feeOmitReason: string;
}

export interface FundDrawdown {
  id: string;
  roundId: string;
  fundId: string;
  eventId: string;
  drawdownAmount: number;
  drawdownRate: number;
  ruleApplied: string;
}

export interface FeeRecord {
  id: string;
  roundId: string;
  fundId: string;
  actionType: ActionType;
  feeAmount: number;
  omitted: boolean;
  omitReason: string;
}

export interface RiskTrigger {
  id: string;
  roundId: string;
  riskType: RiskType;
  eventId: string;
  fundIds: string[];
  ruleId: string;
  description: string;
}

export interface Rule {
  ruleId: string;
  category: "调仓" | "回撤";
  description: string;
  riskType: RiskType;
}

export interface RuleFeedback {
  id: string;
  roundId: string;
  ruleId: string;
  violated: boolean;
  playerAction: string;
  correctAction: string;
  explanation: string;
}

export interface TraceLink {
  fundId: string;
  eventId: string;
  drawdownId: string;
  feeRecordId: string;
  roundId: string;
}

export interface RiskSection {
  totalTriggers: number;
  triggers: RiskTrigger[];
  affectedFunds: string[];
  affectedRounds: string[];
}

export interface RoundReport {
  roundId: string;
  roundNumber: number;
  drawdowns: FundDrawdown[];
  fees: FeeRecord[];
  feedbacks: RuleFeedback[];
  riskTriggers: RiskTrigger[];
}

export interface GameReport {
  totalScore: number;
  maxScore: number;
  survivalRounds: number;
  riskBreakdown: {
    industryConcentration: RiskSection;
    feeOmission: RiskSection;
    panicSelling: RiskSection;
  };
  traceLinks: TraceLink[];
  rounds: RoundReport[];
}

export interface PlayerAction {
  fundId: string;
  action: ActionType;
  shares: number;
}

export interface RiskSlotState {
  type: RiskType;
  level: number;
  maxLevel: number;
  triggers: RiskTrigger[];
}

export interface GameState {
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  funds: FundCard[];
  portfolio: Record<string, number>;
  cash: number;
  initialCash: number;
  rounds: Round[];
  newsEvents: NewsEvent[];
  roundPositions: RoundPosition[];
  drawdowns: FundDrawdown[];
  feeRecords: FeeRecord[];
  riskTriggers: RiskTrigger[];
  ruleFeedbacks: RuleFeedback[];
  traceLinks: TraceLink[];
  riskSlots: RiskSlotState[];
  pendingActions: PlayerAction[];
  report: GameReport | null;
}
