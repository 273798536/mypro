export interface IndustryCard {
  id: string;
  name: string;
  riskLevel: 'low' | 'medium' | 'high';
  expectedReturn: number;
  volatility: number;
  sector: string;
  manager: string;
  contact: string;
}

export interface FundPosition {
  id: string;
  industryCardId: string;
  weight: number;
  cost: number;
  currentValue: number;
  shares: number;
}

export interface NewsEvent {
  id: string;
  industryCardId: string;
  title: string;
  content: string;
  impactType: 'positive' | 'negative' | 'neutral';
  impactMagnitude: number;
  round: number;
  source?: string;
}

export interface Decision {
  id: string;
  newsEventId: string;
  industryCardId: string;
  actionType: 'buy' | 'sell' | 'hold';
  amount: number;
  round: number;
  timestamp: number;
}

export interface RiskEvent {
  id: string;
  type: 'over_concentration' | 'missing_fee' | 'panic_sell' | 'chasing_rally';
  description: string;
  penalty: number;
  round: number;
  responsiblePerson: string;
  fixDocument: string;
}

export interface NetValuePoint {
  round: number;
  value: number;
  decisionId?: string;
  riskEventId?: string;
}

export interface GameState {
  currentRound: number;
  totalRounds: number;
  netValue: number;
  initialNetValue: number;
  riskBudget: number;
  riskScore: number;
  availableCash: number;
  transactionFeeRate: number;
  positions: FundPosition[];
  decisions: Decision[];
  riskEvents: RiskEvent[];
  netValueHistory: NetValuePoint[];
  lastPriceChanges: Record<string, number>;
  consecutiveSellDowns: Record<string, number>;
  isFinished: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  entity: string;
  entityId: string;
  message: string;
  fixSuggestion: string;
  responsiblePerson: string;
}

export interface ValidationWarning {
  field: string;
  entity: string;
  entityId: string;
  message: string;
  suggestion: string;
}

export interface ImportData {
  industryCards: IndustryCard[];
  positions: FundPosition[];
  newsEvents: NewsEvent[];
}

export type RiskType = RiskEvent['type'];

export interface RiskConfig {
  type: RiskType;
  threshold: number;
  penalty: number;
  responsiblePerson: string;
  fixDocument: string;
  descriptionTemplate: string;
}
