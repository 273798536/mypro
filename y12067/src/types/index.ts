export type Direction = "north" | "south" | "east" | "west";
export type ExitStatus = "open" | "blocked" | "missing_field";
export type Difficulty = "easy" | "medium" | "hard";
export type EventType = "congestion" | "elevator_misuse" | "broadcast_missed" | "crowd_reflux";
export type Severity = "warning" | "critical";
export type OperationType = "broadcast" | "elevator_control" | "exit_redirect";
export type DataIssueType = "missing_exit_field" | "floor_note" | "late_crowd";

export interface Exit {
  id: string;
  x: number;
  y: number;
  direction: Direction;
  capacity?: number;
  status?: ExitStatus;
  note?: string;
}

export interface Elevator {
  id: string;
  x: number;
  y: number;
  floors: number[];
  capacity: number;
  isUsable: boolean;
}

export interface Stair {
  id: string;
  x: number;
  y: number;
  width: number;
  capacity: number;
}

export interface FireSource {
  x: number;
  y: number;
  radius: number;
}

export interface FloorPlan {
  id: string;
  name: string;
  width: number;
  height: number;
  grid: number[][];
  exits: Exit[];
  elevators: Elevator[];
  stairs: Stair[];
  fireSource: FireSource;
  notes?: string;
}

export interface CrowdGroup {
  id: string;
  floorId: string;
  x: number;
  y: number;
  count: number;
  speed: number;
  targetExitId?: string;
  arrivalTime?: number;
  note?: string;
}

export interface DataIssue {
  type: DataIssueType;
  description: string;
  affectedId: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  floors: FloorPlan[];
  crowdGroups: CrowdGroup[];
  timeLimit: number;
  dataIssues: DataIssue[];
}

export interface CrowdParticle {
  id: string;
  groupId: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  evacuated: boolean;
  stuck: boolean;
  usingElevator: boolean;
  floorId: string;
}

export interface Operation {
  step: number;
  timestamp: number;
  type: OperationType;
  target: string;
  params: Record<string, unknown>;
  crowdSnapshot: CrowdParticle[];
  scoreDelta: number;
}

export interface GameEvent {
  id: string;
  timestamp: number;
  type: EventType;
  severity: Severity;
  message: string;
  affectedArea: string;
  suggestion: string;
}

export interface ScoreDeduction {
  step: number;
  reason: string;
  points: number;
  eventType: EventType;
  suggestion: string;
  affectedArea: string;
}

export interface ScoreDetail {
  total: number;
  deductions: ScoreDeduction[];
}

export interface ExitFlowInfo {
  exitId: string;
  flow: number;
  queueSize: number;
  capacity: number;
  congestionLevel: number;
}

export interface SimulationStepResult {
  crowdState: CrowdParticle[];
  exitFlows: ExitFlowInfo[];
  evacuated: number;
  events: GameEvent[];
  deductions: ScoreDeduction[];
}

export interface GameSnapshot {
  step: number;
  elapsed: number;
  crowdState: CrowdParticle[];
  exitFlows: ExitFlowInfo[];
  evacuated: number;
  events: GameEvent[];
  score: ScoreDetail;
  operations: Operation[];
  elevatorStates: Record<string, boolean>;
  broadcastAreas: string[];
}
