export type NodeType = 'ice_mine' | 'pump' | 'greenhouse' | 'recycler' | 'base';

export type NodeStatus = 'normal' | 'warning' | 'danger' | 'disconnected';

export type PipeStatus = 'connected' | 'disconnected' | 'leaking';

export type Operator = 'ice_team' | 'recycle_team';

export type AnomalyType = 'pipe_disconnect' | 'recycle_overload' | 'greenhouse_drought';

export type AnomalySeverity = 'warning' | 'critical';

export interface NetworkNode {
  id: string;
  type: NodeType;
  name: string;
  position: { x: number; y: number };
  status: NodeStatus;
  health: number;
  capacity: number;
  currentLoad: number;
}

export interface PipeConnection {
  id: string;
  from: string;
  to: string;
  status: PipeStatus;
  flowRate: number;
  maxFlow: number;
}

export interface MaintenanceRecord {
  id: string;
  nodeId: string;
  round: number;
  operator: Operator;
  action: string;
  effect: { health?: number; capacity?: number; flow?: number };
  timestamp: number;
}

export interface ConflictRecord {
  id: string;
  round: number;
  nodeId: string;
  iceTeamRecord: MaintenanceRecord;
  recycleTeamRecord: MaintenanceRecord;
  resolved: boolean;
  chosenSide?: 'ice' | 'recycle';
}

export interface AnomalyEvent {
  id: string;
  round: number;
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  relatedNodeId?: string;
  relatedPipeId?: string;
  relatedRecordId?: string;
}

export interface Resources {
  water: number;
  ice: number;
  greenhouseHumidity: number;
  baseUsage: number;
}

export interface RoundData {
  roundNumber: number;
  actions: MaintenanceRecord[];
  conflicts: ConflictRecord[];
  anomalies: AnomalyEvent[];
  resources: Resources;
  score: number;
  networkState: {
    nodes: NetworkNode[];
    pipes: PipeConnection[];
  };
}

export interface GameState {
  currentRound: number;
  maxRounds: number;
  isGameOver: boolean;
  totalScore: number;
  nodes: NetworkNode[];
  pipes: PipeConnection[];
  resources: Resources;
  roundHistory: RoundData[];
  pendingConflicts: ConflictRecord[];
  anomalies: AnomalyEvent[];
  currentActions: MaintenanceRecord[];
  showSettlement: boolean;
  lastSettlementData?: RoundData;
}

export interface GameActions {
  addAction: (record: Omit<MaintenanceRecord, 'id' | 'round' | 'timestamp'>) => void;
  resolveConflict: (conflictId: string, chosenSide: 'ice' | 'recycle') => void;
  nextRound: () => void;
  resetGame: () => void;
  closeSettlement: () => void;
}

export type GameStore = GameState & GameActions;
