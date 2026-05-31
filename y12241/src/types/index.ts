export type NodeType = 'power_station' | 'substation' | 'consumer' | 'fault';
export type NodeStatus = 'normal' | 'fault' | 'overload' | 'short_circuit' | 'blocked';

export interface Node {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  powered: boolean;
  load: number;
  maxLoad: number;
  status: NodeStatus;
  label: string;
  isPowerSource?: boolean;
}

export interface Wire {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  active: boolean;
  hasCurrent: boolean;
  resistance: number;
  isCycle?: boolean;
  isParallel?: boolean;
}

export type OperationType = 'place_power' | 'place_wire' | 'place_repair' | 'remove_wire';

export interface Operation {
  id: string;
  stepNumber: number;
  type: OperationType;
  source: string;
  judgment: string;
  result: string;
  timestamp: number;
  nodeIds?: string[];
  wireId?: string;
  isTriggerPoint?: boolean;
}

export type AnomalyType = 'short_circuit' | 'overload' | 'path_blockage' | 'invalid_connection';
export type AnomalySeverity = 'warning' | 'error' | 'critical';

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  stepNumber: number;
  resolved: boolean;
  relatedNodeIds: string[];
  relatedWireIds: string[];
}

export interface LogicChain {
  id: string;
  operationId: string;
  sourceElement: { type: 'node' | 'wire'; id: string };
  judgment: string;
  resultElement: { type: 'node' | 'wire'; id: string };
  color: string;
}

export type ToolType = 'power_station' | 'wire' | 'repair_team';

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  id: string;
  status: GameStatus;
  currentStage: number;
  nodes: Node[];
  wires: Wire[];
  operations: Operation[];
  anomalies: Anomaly[];
  logicChains: LogicChain[];
  unlockedTools: ToolType[];
  selectedTool: ToolType | null;
  selectedNode: string | null;
  score: number;
  timeRemaining: number;
  snapshots: GameStateSnapshot[];
  triggerPoints: TriggerPoint[];
  causeEffectChain?: CauseEffectNode;
}

export interface GameStateSnapshot {
  stepNumber: number;
  nodes: Node[];
  wires: Wire[];
  anomalies: Anomaly[];
  timestamp: number;
}

export interface TriggerPoint {
  stepNumber: number;
  type: 'connect' | 'anomaly' | 'win' | 'lose';
  description: string;
}

export interface CauseEffectNode {
  id: string;
  label: string;
  type: 'operation' | 'anomaly' | 'result';
  children: CauseEffectNode[];
}

export interface ReplayState {
  gameId: string;
  currentStep: number;
  isPlaying: boolean;
  speed: number;
}

export interface ExampleGame {
  id: string;
  title: string;
  description: string;
  type: 'normal' | 'blockage';
  initialState: Partial<GameState>;
  operations: Operation[];
  expectedResult: string;
  triggerPointStep: number;
}
