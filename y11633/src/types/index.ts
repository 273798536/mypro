export interface Position {
  x: number;
  y: number;
}

export type RobotStatus = 'idle' | 'moving' | 'charging' | 'picking' | 'blocked' | 'low_battery';
export type OrderPriority = 'high' | 'medium' | 'low';
export type OrderStatus = 'pending' | 'assigned' | 'completed' | 'timeout';
export type ObstacleType = 'wall' | 'equipment' | 'danger';
export type AnomalyType = 'collision' | 'low_battery' | 'timeout';
export type ScoreItemType = 'order_complete' | 'efficiency' | 'penalty' | 'bonus';
export type GameLevel = 'easy' | 'medium' | 'hard';
export type GameStatus = 'ready' | 'playing' | 'paused' | 'finished';

export interface Robot {
  id: string;
  name: string;
  position: Position;
  battery: number;
  status: RobotStatus;
  currentOrderId: string | null;
  path: Position[];
  targetPosition: Position | null;
}

export interface Order {
  id: string;
  shelfId: string;
  priority: OrderPriority;
  status: OrderStatus;
  timeLimit: number;
  remainingTime: number;
  createdAt: number;
  reward: number;
  itemName: string;
}

export interface Shelf {
  id: string;
  position: Position;
  name: string;
}

export interface Charger {
  id: string;
  position: Position;
  chargeRate: number;
}

export interface Obstacle {
  id: string;
  position: Position;
  type: ObstacleType;
}

export interface Anomaly {
  id: string;
  type: AnomalyType;
  timestamp: number;
  robotId?: string;
  orderId?: string;
  message: string;
  penalty: number;
}

export interface ScoreItem {
  id: string;
  timestamp: number;
  type: ScoreItemType;
  description: string;
  value: number;
  source: string;
}

export interface ReplayFrame {
  timestamp: number;
  robots: Robot[];
  orders: Order[];
}

export interface GameState {
  id: string;
  level: GameLevel;
  status: GameStatus;
  startTime: number;
  endTime: number;
  elapsedTime: number;
  totalScore: number;
  speed: number;
  robots: Robot[];
  orders: Order[];
  shelves: Shelf[];
  chargers: Charger[];
  obstacles: Obstacle[];
  anomalies: Anomaly[];
  scoreHistory: ScoreItem[];
  replayData: ReplayFrame[];
  selectedRobotId: string | null;
  gridSize: number;
}

export interface LevelConfig {
  id: GameLevel;
  name: string;
  description: string;
  gridSize: number;
  robotCount: number;
  orderCount: number;
  orderInterval: number;
  obstacleCount: number;
  chargerCount: number;
  shelfCount: number;
  initialBattery: number;
  batteryDrainRate: number;
  chargeRate: number;
  collisionPenalty: number;
  lowBatteryPenalty: number;
  timeoutPenalty: number;
  orderTimeLimit: { high: number; medium: number; low: number };
  orderReward: { high: number; medium: number; low: number };
}

export interface GameRecord {
  id: string;
  level: GameLevel;
  totalScore: number;
  completedOrders: number;
  totalOrders: number;
  anomalies: number;
  startTime: number;
  endTime: number;
  duration: number;
}
