export type GrowthStage = "\u79CD\u690D" | "\u751F\u957F" | "\u6210\u719F" | "\u6536\u5272";
export type Direction = "\u591A\u5934" | "\u7A7A\u5934";
export type WeatherType = "\u6B63\u5E38" | "\u5E72\u65F1" | "\u66B4\u96E8" | "\u597D\u5929\u6C14";
export type RiskLevel = "\u63D0\u793A" | "\u8B66\u544A" | "\u5371\u9669";
export type RiskCategory = "\u5408\u7EA6\u5230\u671F" | "\u4ED3\u50A8\u8D85\u9650" | "\u73B0\u8D27\u8FDD\u7EA6" | "\u57FA\u5DEE\u5F02\u5E38";
export type LogType = "info" | "warning" | "danger" | "success";

export interface Crop {
  id: string;
  name: string;
  acreage: number;
  expectedYield: number;
  actualYield: number;
  growthStage: GrowthStage;
  unitPrice: number;
}

export interface Warehouse {
  currentStock: number;
  maxCapacity: number;
  unitStorageCost: number;
}

export interface FuturesPosition {
  id: string;
  commodity: string;
  direction: Direction;
  lots: number;
  contractMultiplier: number;
  openPrice: number;
  currentPrice: number;
  expiryTurn: number;
  isExpired: boolean;
  isSettled: boolean;
}

export interface SpotOrder {
  id: string;
  buyer: string;
  commodity: string;
  quantity: number;
  agreedPrice: number;
  deliveryTurn: number;
  isDefaulted: boolean;
  isDelivered: boolean;
  defaultRatio: number;
}

export interface WeatherEvent {
  turn: number;
  type: WeatherType;
  yieldModifier: number;
  description: string;
}

export interface RiskAlert {
  turn: number;
  level: RiskLevel;
  category: RiskCategory;
  message: string;
}

export interface EventLogEntry {
  turn: number;
  timestamp: number;
  message: string;
  type: LogType;
}

export interface PriceSchedule {
  [commodity: string]: { [turn: string]: number };
}

export interface ScheduledEvent {
  turn: number;
  type: string;
  payload: Record<string, unknown>;
}

export interface LevelConfig {
  id: string;
  name: string;
  difficulty: 1 | 2 | 3;
  description: string;
  keyKnowledge: string;
  maxTurns: number;
  initialCash: number;
  crops: Omit<Crop, "actualYield" | "growthStage">[];
  warehouse: Warehouse;
  initialFutures: Omit<FuturesPosition, "currentPrice" | "isExpired" | "isSettled">[];
  initialSpotOrders: SpotOrder[];
  weatherSchedule: WeatherEvent[];
  priceSchedule: PriceSchedule;
  events: ScheduledEvent[];
}

export interface FuturesPnLDetail {
  positionId: string;
  commodity: string;
  direction: Direction;
  openPrice: number;
  closePrice: number;
  lots: number;
  multiplier: number;
  pnl: number;
  conclusion: string;
}

export interface SpotPnLDetail {
  orderId: string;
  commodity: string;
  agreedPrice: number;
  marketPrice: number;
  quantity: number;
  pnl: number;
  isDefaulted: boolean;
  defaultLoss: number;
  conclusion: string;
}

export interface BasisAnalysisDetail {
  turn: number;
  commodity: string;
  spotPrice: number;
  futuresPrice: number;
  basis: number;
  basisChange: number;
}

export interface SettlementResult {
  futuresPnL: FuturesPnLDetail[];
  spotPnL: SpotPnLDetail[];
  storageCost: number;
  defaultLoss: number;
  initialCash: number;
  finalCash: number;
  netHedgingEffect: number;
  basisAnalysis: BasisAnalysisDetail[];
}

export interface ExportReport {
  levelId: string;
  levelName: string;
  completedAt: string;
  totalTurns: number;
  settlement: SettlementResult;
  riskAlerts: RiskAlert[];
  futuresConclusions: string[];
  summaryConclusion: string;
}

export interface GameState {
  levelId: string;
  turn: number;
  maxTurns: number;
  cash: number;
  initialCash: number;
  crops: Crop[];
  warehouse: Warehouse;
  futuresPositions: FuturesPosition[];
  spotOrders: SpotOrder[];
  weatherHistory: WeatherEvent[];
  riskAlerts: RiskAlert[];
  eventLog: EventLogEntry[];
  isFinished: boolean;
  currentPrices: Record<string, number>;
  settlement: SettlementResult | null;
}

export type GameAction =
  | { type: "OPEN_FUTURES"; commodity: string; direction: Direction; lots: number; openPrice: number; expiryTurn: number }
  | { type: "CLOSE_FUTURES"; positionId: string }
  | { type: "ADD_SPOT_ORDER"; order: SpotOrder }
  | { type: "DELIVER_SPOT"; orderId: string }
  | { type: "NEXT_TURN" }
  | { type: "START_LEVEL"; config: LevelConfig }
  | { type: "RESET" };
