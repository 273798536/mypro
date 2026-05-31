export interface Collateral {
  id: string;
  asset: string;
  amount: number;
  source: string;
  version: string;
}

export interface Oracle {
  id: string;
  asset: string;
  price: number;
  source: string;
  version: string;
  volatility: number;
}

export interface Position {
  id: string;
  source: string;
  version: string;
  debtAmount: number;
  debtAsset: string;
  collaterals: Collateral[];
  oracle: Oracle;
  createdAt: number;
}

export interface Level {
  id: string;
  name: string;
  difficulty: number;
  safetyRatio: number;
  liquidationRatio: number;
  description: string;
  startNodeId: string;
  endNodeId: string;
  positionId: string;
  initialGas: number;
}

export interface MazeNode {
  id: string;
  x: number;
  y: number;
  type: 'start' | 'decision' | 'risk' | 'end';
  label: string;
  description: string;
  choices: NodeChoice[];
  priceJumpChance?: number;
  gasCost?: number;
}

export interface NodeChoice {
  id: string;
  label: string;
  description: string;
  nextNodeId: string;
  impact: {
    collateralChange?: number;
    debtChange?: number;
    gasChange?: number;
    priceVolatilityMultiplier?: number;
  };
  ruleHint: string;
}

export interface GameNode {
  id: string;
  gameId: string;
  stepIndex: number;
  nodeId: string;
  choice: string;
  choiceLabel: string;
  collateralValue: number;
  collateralRatio: number;
  gasUsed: number;
  gasRemaining: number;
  price: number;
  priceEvent: string;
  timestamp: number;
  ruleFeedback: string;
}

export type FailureType = 'price_jump' | 'repeated_liquidation' | 'gas_insufficient';

export interface ImpactLink {
  id: string;
  description: string;
  affectedMetric: string;
  change: string;
  ruleReference: string;
}

export interface FailureEvent {
  type: FailureType;
  triggerNode: string;
  triggerStep: number;
  impactChain: ImpactLink[];
  explanation: string;
  affectedResults: string[];
}

export type GameStatus = 'playing' | 'success' | 'failed';

export interface GameState {
  id: string;
  levelId: string;
  playerName: string;
  position: Position;
  currentNodeId: string;
  currentPrice: number;
  path: string[];
  collateralValue: number;
  debtValue: number;
  collateralRatio: number;
  gasRemaining: number;
  priceHistory: { step: number; price: number }[];
  status: GameStatus;
  failureEvent?: FailureEvent;
  nodeHistory: GameNode[];
  startTime: number;
  endTime?: number;
  repeatedLiquidationCount: number;
}

export interface PlayerScore {
  id: string;
  gameId: string;
  playerName: string;
  levelId: string;
  levelName: string;
  timeUsed: number;
  successRate: number;
  avgCollateralRatio: number;
  score: number;
  timestamp: number;
}

export interface GameRecord {
  gameId: string;
  playerName: string;
  levelId: string;
  levelName: string;
  status: GameStatus;
  failureType?: FailureType;
  timeUsed: number;
  score: number;
  timestamp: number;
  positionId: string;
}

export const FAILURE_TYPE_LABELS: Record<FailureType, string> = {
  price_jump: '价格跳变',
  repeated_liquidation: '重复清算',
  gas_insufficient: 'Gas不足',
};

export const FAILURE_TYPE_DESCRIPTIONS: Record<FailureType, string> = {
  price_jump: '抵押物价格突发剧烈下跌，导致抵押率击穿清算线',
  repeated_liquidation: '同一仓位被多次清算，抵押物消耗殆尽',
  gas_insufficient: '清算交易消耗Gas超过剩余额度，交易失败',
};
