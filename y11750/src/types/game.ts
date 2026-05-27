export type GameStatus = 'idle' | 'playing' | 'paused' | 'ended' | 'bankrupt';

export type OrderStatus = 'pending' | 'accepted' | 'cancelled' | 'delivered';

export type ContractStatus = 'active' | 'exercised' | 'expired';

export type CashFlowCategory = 'revenue' | 'cost' | 'fee' | 'penalty';

export type EventType = 'order_cancelled' | 'over_hedging' | 'cash_shortage' | 'normal';

export type EventSeverity = 'info' | 'warning' | 'error';

export type Currency = 'USD' | 'EUR';

export interface Order {
  id: string;
  amount: number;
  currency: Currency;
  deliveryRound: number;
  unitPrice: number;
  status: OrderStatus;
  cancelProbability: number;
}

export interface ForwardContract {
  id: string;
  orderId: string;
  lockedRate: number;
  amount: number;
  maturityRound: number;
  feeRate: number;
  status: ContractStatus;
}

export interface CashFlowItem {
  category: CashFlowCategory;
  description: string;
  amount: number;
}

export interface GameEvent {
  type: EventType;
  severity: EventSeverity;
  message: string;
  details?: Record<string, unknown>;
}

export interface RoundRecord {
  round: number;
  exchangeRate: number;
  forwardRate: number;
  orders: Order[];
  contracts: ForwardContract[];
  cashFlow: CashFlowItem[];
  events: GameEvent[];
  netProfit: number;
  endingCash: number;
  endingInventory: number;
}

export interface GameState {
  id: string;
  round: number;
  maxRounds: number;
  status: GameStatus;
  cash: number;
  inventory: number;
  exchangeRate: number;
  forwardRate: number;
  history: RoundRecord[];
  pendingOrders: Order[];
  activeOrders: Order[];
  activeContracts: ForwardContract[];
  endReason?: string;
  createdAt: number;
  updatedAt: number;
}

export interface GameHistoryMeta {
  id: string;
  finalScore: number;
  finalCash: number;
  totalRounds: number;
  status: 'completed' | 'bankrupt';
  endReason?: string;
  createdAt: number;
}
