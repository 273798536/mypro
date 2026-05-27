export type NodeType = 'source' | 'junction' | 'valve' | 'user' | 'leak';

export interface PipeNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  name: string;
  isMainValve?: boolean;
  pressure?: number;
  basePressure?: number;
}

export interface PipeConnection {
  id: string;
  from: string;
  to: string;
  diameter: number;
}

export interface ValveState {
  nodeId: string;
  isOpen: boolean;
  operatedAt: number;
  operator: 'player' | 'system';
}

export interface LeakState {
  nodeId: string;
  isControlled: boolean;
  flowRate: number;
}

export interface UserZone {
  id: string;
  nodeIds: string[];
  name: string;
  population: number;
  hasWater: boolean;
}

export type WarningType = 'main_valve' | 'low_pressure' | 'duplicate_zone';

export interface OperationStep {
  id: string;
  timestamp: number;
  type: 'valve_toggle';
  valveId: string;
  previousState: boolean;
  newState: boolean;
  isHighRisk: boolean;
  warningType?: WarningType;
  confirmed: boolean;
}

export interface Alert {
  id: string;
  timestamp: number;
  type: WarningType;
  message: string;
  valveId?: string;
  acknowledged: boolean;
}

export interface Score {
  total: number;
  leakControl: number;
  userImpact: number;
  operationEfficiency: number;
  compliance: number;
  level: 'S' | 'A' | 'B' | 'C' | 'D';
}

export interface ReportItem {
  id: string;
  type: string;
  description: string;
  source: string;
  timestamp: number;
  stepIndex?: number;
}

export interface RepairReport {
  gameId: string;
  generatedAt: number;
  duration: number;
  totalScore: Score;
  unhandled: ReportItem[];
  corrected: ReportItem[];
  needConfirmation: ReportItem[];
  operationTrail: OperationStep[];
  failureAnalysis: string[];
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished' | 'replaying';

export interface GameState {
  status: GameStatus;
  startTime: number | null;
  endTime: number | null;
  currentStepIndex: number;
  nodes: PipeNode[];
  connections: PipeConnection[];
  valves: Map<string, ValveState>;
  leaks: Map<string, LeakState>;
  userZones: UserZone[];
  operations: OperationStep[];
  alerts: Alert[];
  score: Score;
  pendingOperation: OperationStep | null;
}

export interface SceneConfig {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  nodes: PipeNode[];
  connections: PipeConnection[];
  initialValves: { nodeId: string; isOpen: boolean }[];
  leaks: { nodeId: string; flowRate: number }[];
  userZones: UserZone[];
  targetTime: number;
}
