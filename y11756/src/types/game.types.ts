export interface Industry {
  id: string;
  name: string;
  icon: string;
  description: string;
  basePE: number;
  basePB: number;
  volatility: number;
  beta: number;
  currentPrice: number;
  priceHistory: number[];
  dailyChange: number;
}

export interface Position {
  industryId: string;
  weight: number;
  costPrice: number;
  currentPrice: number;
  shares: number;
  marketValue: number;
  profit: number;
  profitRate: number;
}

export interface TradeRecord {
  round: number;
  timestamp: Date;
  industryId: string;
  action: 'buy' | 'sell';
  weightChange: number;
  price: number;
  fee: number;
  reason?: string;
}

export interface NewsEvent {
  id: string;
  round: number;
  title: string;
  content: string;
  type: 'positive' | 'negative' | 'neutral';
  industryAffected: string[];
  impact: { [industryId: string]: number };
  source: string;
}

export type RiskType = 'concentration' | 'chasing' | 'fee_erosion' | 'leverage';
export type RiskSeverity = 'low' | 'medium' | 'high';

export interface RiskWarning {
  id: string;
  type: RiskType;
  severity: RiskSeverity;
  message: string;
  details: any;
  timestamp: Date;
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'ended';
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface GameScore {
  totalReturn: number;
  riskAdjustedReturn: number;
  maxDrawdown: number;
  diversificationScore: number;
  feeEfficiency: number;
  eventResponseScore: number;
  totalScore: number;
  grade: string;
  failureReasons: string[];
  suggestions: string[];
}

export interface GameState {
  gameId: string;
  status: GameStatus;
  difficulty: Difficulty;
  round: number;
  maxRounds: number;
  totalAssets: number;
  initialAssets: number;
  netValue: number;
  netValueHistory: number[];
  positions: Position[];
  industries: Industry[];
  currentEvent: NewsEvent | null;
  eventHistory: NewsEvent[];
  tradeHistory: TradeRecord[];
  riskWarnings: RiskWarning[];
  riskBudget: number;
  riskUsed: number;
  totalFees: number;
  score: GameScore | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameHistory {
  gameId: string;
  createdAt: Date;
  totalReturn: number;
  totalScore: number;
  grade: string;
}
