export type CellType = 'aisle' | 'shelf' | 'charger' | 'dispatch';

export interface Position {
  x: number;
  y: number;
}

export interface GridCell {
  x: number;
  y: number;
  type: CellType;
  blocked: boolean;
}

export interface WarehouseMap {
  width: number;
  height: number;
  cells: GridCell[][];
}

export type RobotState = 'idle' | 'moving_to_shelf' | 'picking' | 'moving_to_dispatch' | 'delivering' | 'charging' | 'blocked' | 'collision_cooldown';

export interface Robot {
  id: string;
  name: string;
  color: string;
  position: Position;
  battery: number;
  maxBattery: number;
  currentOrderId: string | null;
  path: Position[];
  pathIndex: number;
  state: RobotState;
  collisionCooldown: number;
  lowBatteryWarned: boolean;
}

export type OrderPriority = 'urgent' | 'normal' | 'low';
export type TimeoutReason = 'low_battery' | 'path_collision' | 'blocked_aisle' | 'no_available_robot';
export type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'timeout';

export interface Order {
  id: string;
  shelfPosition: Position;
  dispatchPosition: Position;
  priority: OrderPriority;
  timeLimit: number;
  elapsed: number;
  assignedRobotId: string | null;
  status: OrderStatus;
  timeoutReason?: TimeoutReason;
  hadCollision: boolean;
  hadLowBattery: boolean;
  hadBlockedAisle: boolean;
}

export type GameEventType = 'collision' | 'timeout' | 'charging' | 'order_complete' | 'low_battery_warning' | 'order_assigned';

export interface GameEvent {
  tick: number;
  type: GameEventType;
  details: string;
  position?: Position;
}

export interface ReplayFrame {
  tick: number;
  robots: { id: string; position: Position; battery: number; state: RobotState; currentOrderId: string | null }[];
  orders: { id: string; status: OrderStatus; elapsed: number }[];
  events: GameEvent[];
  score: number;
}

export type GamePhase = 'setup' | 'running' | 'paused' | 'settled';

export interface ConfigDiff {
  key: string;
  path: string;
  robotValue: unknown;
  shelfValue: unknown;
  resolved: 'robot' | 'shelf' | null;
}

export interface RobotConfig {
  id: string;
  name: string;
  color: string;
  startX: number;
  startY: number;
  maxBattery: number;
  speed: number;
}

export interface ShelfConfig {
  positions: Position[];
  blockedAisles: Position[];
}

export interface ScenarioConfig {
  mapWidth: number;
  mapHeight: number;
  chargerPositions: Position[];
  dispatchPositions: Position[];
  robots: RobotConfig[];
  shelves: ShelfConfig;
  orderInterval: number;
  maxOrders: number;
  timeLimit: number;
}
