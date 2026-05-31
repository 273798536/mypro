export interface Position {
  x: number;
  y: number;
}

export interface Traceable {
  id: string;
  source: string;
  createdAt: number;
}

export type RobotStatus = 'idle' | 'moving' | 'charging' | 'delivering' | 'low-battery';

export interface Robot extends Traceable {
  name: string;
  position: Position;
  battery: number;
  maxBattery: number;
  status: RobotStatus;
  currentOrderId?: string;
  currentPath?: Position[];
  pathIndex?: number;
}

export interface Shelf extends Traceable {
  name: string;
  position: Position;
  goodsType: string;
  stock: number;
}

export type ObstacleType = 'wall' | 'restricted' | 'charging';

export interface Obstacle extends Traceable {
  name: string;
  position: Position;
  type: ObstacleType;
}

export type OrderStatus = 'pending' | 'assigned' | 'completed' | 'timeout';

export interface Order extends Traceable {
  name: string;
  goodsType: string;
  quantity: number;
  deadline: number;
  reward: number;
  status: OrderStatus;
  assignedRobotId?: string;
  completedAt?: number;
}

export type PresetSceneType = 'low-battery' | 'collision' | 'timeout' | 'custom';

export interface Scene extends Traceable {
  name: string;
  description: string;
  gridWidth: number;
  gridHeight: number;
  robots: Robot[];
  shelves: Shelf[];
  obstacles: Obstacle[];
  orders: Order[];
  presetType: PresetSceneType;
}

export interface PathFindingRecord {
  id: string;
  robotId: string;
  robotName: string;
  path: Position[];
  triggerStep: number;
  triggerReason: string;
  startPosition: Position;
  endPosition: Position;
}

export interface PauseRecord {
  id: string;
  pauseTime: number;
  resumeTime?: number;
  duration?: number;
  reason?: string;
}

export type DecisionType = 'assign-order' | 're-route' | 'charge' | 'wait' | 'cancel-order';

export interface Decision {
  id: string;
  type: DecisionType;
  targetId: string;
  targetName: string;
  description: string;
  impact: string;
}

export interface GameState {
  robots: Robot[];
  orders: Order[];
  currentTime: number;
  maxTime: number;
  score: number;
  isGameOver: boolean;
  isPaused: boolean;
  isWin: boolean;
}

export interface GameStep {
  stepNumber: number;
  timestamp: number;
  decisions: Decision[];
  pathFindings: PathFindingRecord[];
  stateSnapshot: GameState;
}

export interface ScoreBreakdown {
  completedOrders: number;
  timeoutOrders: number;
  baseScore: number;
  timeBonus: number;
  pausePenalty: number;
  total: number;
}

export interface GameResult {
  isWin: boolean;
  finalScore: number;
  reason: string;
  keyDecisions: string[];
  pauseImpact: {
    totalPauseTime: number;
    scoreReduction: number;
    details: string;
  };
  pathFindingTriggers: PathFindingRecord[];
  scoreBreakdown: ScoreBreakdown;
}

export interface GameRecord {
  id: string;
  sceneId: string;
  sceneName: string;
  playerName: string;
  startTime: number;
  endTime: number;
  result: GameResult;
  steps: GameStep[];
  pauseRecords: PauseRecord[];
  initialScene: Scene;
}

export interface Collision {
  type: 'robot-robot' | 'robot-obstacle' | 'path-conflict';
  robotId1: string;
  robotId2?: string;
  position: Position;
  description: string;
}

export interface PathNode {
  position: Position;
  g: number;
  h: number;
  f: number;
  parent?: PathNode;
}
