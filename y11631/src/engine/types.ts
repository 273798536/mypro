export type Difficulty = 'beginner' | 'intermediate' | 'expert' | 'hell';

export type GameStatus = 'idle' | 'playing' | 'paused' | 'ended';

export type OrderSide = 'buy' | 'sell';

export type OrderStatus = 'active' | 'filled' | 'cancelled';

export type EventType = 'price_jump' | 'liquidity_crisis' | 'fee_change' | 'volatility_spike';

export type EventSeverity = 'info' | 'warning' | 'critical';

export interface DifficultyConfig {
  name: string;
  baseVolatility: number;
  eventFrequency: number;
  feeRate: number;
  inventoryPenaltyCoeff: number;
  targetScore: number;
  gameDuration: number;
}

export interface Order {
  id: string;
  side: OrderSide;
  price: number;
  quantity: number;
  timestamp: number;
  status: OrderStatus;
}

export interface Trade {
  id: string;
  side: OrderSide;
  price: number;
  quantity: number;
  fee: number;
  timestamp: number;
  pnlContribution: number;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastPrice: number;
}

export interface GameEvent {
  id: string;
  type: EventType;
  severity: EventSeverity;
  message: string;
  effect: Record<string, any>;
  timestamp: number;
  duration: number;
  applied?: boolean;
}

export interface PricePoint {
  time: number;
  price: number;
}

export interface InventoryPoint {
  time: number;
  inventory: number;
}

export interface GameState {
  status: GameStatus;
  difficulty: Difficulty;
  timeRemaining: number;
  totalTime: number;
  currentPrice: number;
  inventory: number;
  avgCost: number;
  cash: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalFees: number;
  inventoryPenalty: number;
  eventBonus: number;
  score: number;
  activeOrders: Order[];
  tradeHistory: Trade[];
  events: GameEvent[];
  orderBook: OrderBook;
  priceHistory: PricePoint[];
  inventoryHistory: InventoryPoint[];
  gameOverReason?: string;
  endReason?: 'timeout' | 'bankrupt' | 'manual' | 'force_liquidation';
}

export interface PlayerAction {
  type: 'place_order' | 'cancel_order' | 'settle';
  payload: any;
  timestamp: number;
}

export interface ReplaySnapshot {
  timestamp: number;
  gameState: GameState;
  playerAction?: PlayerAction;
}

export interface ReplayData {
  id: string;
  startTime: number;
  endTime: number;
  difficulty: Difficulty;
  finalScore: number;
  snapshots: ReplaySnapshot[];
  events: GameEvent[];
}

export interface GameRecord {
  id: string;
  startTime: number;
  endTime: number;
  difficulty: Difficulty;
  score: number;
  realizedPnL: number;
  totalFees: number;
  inventoryPenalty: number;
  tradeCount: number;
  endReason: string;
  replayData?: ReplayData;
}

export interface SettlementReport {
  totalScore: number;
  scoreBreakdown: {
    realizedPnL: number;
    unrealizedPnL: number;
    fees: number;
    inventoryPenalty: number;
    eventBonus: number;
  };
  tradeSummary: {
    totalTrades: number;
    buyTrades: number;
    sellTrades: number;
    avgSpread: number;
  };
  riskAnalysis: {
    maxInventory: number;
    inventoryViolations: number;
    feeToProfitRatio: number;
  };
  eventsEncountered: GameEvent[];
  rating: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  failureReasons: string[];
}
