export interface Position {
  x: number;
  y: number;
}

export type GateStatus = 'normal' | 'faulty' | 'restricted' | 'closed';

export interface Gate {
  id: string;
  name: string;
  position: Position;
  capacity: number;
  status: GateStatus;
  isFaulty: boolean;
  width: number;
  height: number;
}

export interface Exit {
  id: string;
  name: string;
  position: Position;
  capacity: number;
  congestionLevel: number;
  width: number;
  height: number;
}

export type PassengerStatus = 'entering' | 'moving' | 'waiting' | 'exited' | 'stuck';

export interface Passenger {
  id: string;
  position: Position;
  targetExit: string;
  speed: number;
  status: PassengerStatus;
  path: Position[];
  color: string;
  enteredAt: number;
  exitedAt?: number;
}

export type BroadcastCategory = 'evacuation' | 'diversion' | 'lockdown' | 'reassurance';

export interface Broadcast {
  id: string;
  category: BroadcastCategory;
  title: string;
  content: string;
  cooldownSeconds: number;
  relatedLocations: string[];
  triggerCondition?: string;
}

export interface BroadcastLog {
  id: string;
  broadcastId: string;
  timestamp: number;
  wasMissed: boolean;
  locationRef?: string;
}

export type PenaltyCategory = 'congestion' | 'missed_broadcast' | 'wrong_diversion' | 'safety_risk' | 'cooldown_violation';

export interface Penalty {
  id: string;
  penaltyPoints: number;
  category: PenaltyCategory;
  reason: string;
  humanReadableReason: string;
  locationRef: string;
  locationType: 'gate' | 'exit' | 'area';
  timestamp: number;
  suggestion: string;
}

export interface LockdownArea {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DiversionRoute {
  fromGateId: string;
  toExitId: string;
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished';

export interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  message: string;
  locationRef?: string;
  timestamp: number;
}

export interface GameState {
  id: string;
  levelId: string;
  status: GameStatus;
  currentTime: number;
  totalDuration: number;
  score: number;
  passengers: Passenger[];
  gates: Gate[];
  exits: Exit[];
  broadcastLogs: BroadcastLog[];
  penalties: Penalty[];
  alerts: Alert[];
  lockdownAreas: LockdownArea[];
  diversionRoutes: DiversionRoute[];
  broadcastCooldowns: Record<string, number>;
  activeBroadcastId: string | null;
  selectedLocationId: string | null;
}

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface GameResult {
  id: string;
  gameId: string;
  totalScore: number;
  maxPossibleScore: number;
  grade: Grade;
  penalties: Penalty[];
  simulationSummary: {
    totalPassengers: number;
    evacuatedPassengers: number;
    avgEvacuationTime: number;
    maxCongestionLevel: number;
    gateUtilization: Record<string, number>;
    congestionHotspots: Array<{ locationId: string; maxLevel: number; duration: number }>;
    missedBroadcasts: Array<{ broadcastId: string; count: number }>;
  };
  createdAt: number;
  gateConfigSnapshot: Gate[];
  exitConfigSnapshot: Exit[];
  broadcastSnapshot: Broadcast[];
}

export type ChangeType = 'broadcast_added' | 'broadcast_modified' | 'gate_modified' | 'map_modified';

export interface ChangeRecord {
  id: string;
  timestamp: number;
  type: ChangeType;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  affectedConclusions: string[];
}

export interface StationMap {
  id: string;
  name: string;
  width: number;
  height: number;
  gates: Gate[];
  exits: Exit[];
  walls: Array<{ x: number; y: number; width: number; height: number }>;
  entrances: Array<{ id: string; x: number; y: number; name: string }>;
}

export interface Level {
  id: string;
  name: string;
  description: string;
  mapId: string;
  duration: number;
  passengerSpawnRate: number;
  initialFaultyGates: string[];
  targetPassengers: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ResultComparison {
  oldResult: GameResult;
  newResult: GameResult;
  differences: Array<{
    category: string;
    field: string;
    oldValue: unknown;
    newValue: unknown;
    change: 'increase' | 'decrease' | 'changed';
    impact: 'positive' | 'negative' | 'neutral';
  }>;
}
