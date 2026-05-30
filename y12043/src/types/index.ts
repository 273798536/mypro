export type RiskLevel = 1 | 2 | 3 | 4 | 5;

export type RouteBranch = 'A' | 'B' | 'C';

export type PenaltyType = 'drawdown' | 'fee' | 'route_block';

export type MissingFieldHandling = 'block' | 'warn' | 'allow';

export type FeeType = 'buy' | 'sell' | 'transfer';

export interface Fund {
  id: string;
  name: string;
  code: string;
  expectedReturn: number;
  riskLevel: RiskLevel;
  industryId: string | null;
  industryName?: string;
  note: string;
  feeRate: number;
  isHot?: boolean;
}

export interface Industry {
  id: string;
  name: string;
  color: string;
}

export interface IndustryGate {
  id: string;
  industryId: string | null;
  industryName?: string;
  maxConcentration: number;
  condition: 'exceed' | 'reach';
  penaltyType: PenaltyType;
  penaltyValue: number;
  missingFieldHandling: MissingFieldHandling;
}

export interface Decision {
  step: number;
  nodeId: string;
  fundId: string | null;
  amount: number;
  routeBranch: RouteBranch;
  triggerReason: string;
  timestamp: number;
}

export interface DrawdownRecord {
  step: number;
  triggerPoint: string;
  drawdownPercent: number;
  cause: string;
  suggestion: string;
}

export interface FeeRecord {
  step: number;
  amount: number;
  type: FeeType;
  isDeducted: boolean;
  deductedAt?: number;
  fundId?: string;
}

export interface MazeNode {
  id: string;
  x: number;
  y: number;
  type: 'start' | 'choice' | 'industry_gate' | 'event' | 'end';
  industryGateId?: string;
  eventType?: string;
  connections: {
    branch: RouteBranch;
    nodeId: string;
    condition?: string;
  }[];
}

export interface Maze {
  id: string;
  nodes: Record<string, MazeNode>;
  startNode: string;
  endNode: string;
  totalSteps: number;
}

export interface GameConfig {
  id: string;
  version: string;
  name: string;
  createdAt: number;
  isActive: boolean;
  industryGates: IndustryGate[];
  funds: Fund[];
  mazeId: string;
}

export interface GameState {
  id: string;
  configVersion: string;
  configId: string;
  startCapital: number;
  currentCapital: number;
  currentStep: number;
  currentNode: string;
  decisions: Decision[];
  portfolio: Record<string, number>;
  drawdowns: DrawdownRecord[];
  fees: FeeRecord[];
  capitalHistory: { step: number; capital: number }[];
  isCompleted: boolean;
  startTime: number;
  endTime?: number;
}

export interface ReviewAnalysis {
  finalReturn: number;
  finalReturnPercent: number;
  maxDrawdown: number;
  industryConcentration: Record<string, number>;
  totalFees: number;
  missedFees: FeeRecord[];
  keyMistakes: {
    step: number;
    type: string;
    description: string;
    impact: number;
    suggestion: string;
  }[];
  routeEfficiency: number;
  diversificationScore: number;
  suggestions: string[];
}

export interface GameComparison {
  gameId: string;
  oldConfig: GameConfig;
  newConfig: GameConfig;
  oldResult: GameState;
  newResult: GameState;
  differences: {
    category: string;
    field: string;
    oldValue: number | string;
    newValue: number | string;
    impact: string;
  }[];
}
