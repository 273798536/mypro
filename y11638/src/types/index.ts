export interface Node {
  id: string;
  x: number;
  y: number;
  isAnchor: boolean;
  isDeck: boolean;
}

export interface Member {
  id: string;
  startNodeId: string;
  endNodeId: string;
  materialId: string;
  stress: number;
  maxStress: number;
  broken: boolean;
}

export interface Material {
  id: string;
  name: string;
  costPerMeter: number;
  maxCompression: number;
  maxTension: number;
  density: number;
  color: string;
  source?: string;
  importedAt?: number;
  revision?: number;
}

export interface Vehicle {
  id: string;
  name: string;
  weight: number;
  speed: number;
  width: number;
  wheels: { x: number; radius: number }[];
  color: string;
}

export interface Level {
  id: string;
  name: string;
  description: string;
  budget: number;
  span: number;
  height: number;
  anchors: { x: number; y: number }[];
  vehicles: string[];
  windLoad: number;
  deckNodes: { x: number; y: number }[];
  groundY: number;
}

export interface ReplayFrame {
  timestamp: number;
  nodePositions: { [nodeId: string]: { x: number; y: number } };
  memberStresses: { [memberId: string]: number };
  vehiclePosition: number;
  budgetUsed: number;
  warnings: string[];
}

export type FailureReason = 'overload' | 'overbudget' | 'anchor_fail' | 'wind' | 'vehicle_fall';

export interface GameSession {
  id: string;
  levelId: string;
  nodes: Node[];
  members: Member[];
  totalCost: number;
  windSetting: number;
  startTime: number;
  endTime?: number;
  success: boolean;
  failureReason?: FailureReason;
  failureMemberId?: string;
  failureMessage?: string;
  score?: number;
  stars?: number;
  replayData: ReplayFrame[];
  maxStressRecorded: number;
  warnings: string[];
}

export type ImportStrategy = 'ignore' | 'overwrite' | 'append';

export interface ImportLogEntry {
  materialId: string;
  action: 'ignored' | 'overwritten' | 'appended' | 'updated';
  timestamp: number;
  previousSource?: string;
  newSource?: string;
}

export interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  currentTime: number;
  vehicleProgress: number;
  currentVehicleIndex: number;
  maxStress: number;
  hasFailed: boolean;
  failureReason?: FailureReason;
  failureMessage?: string;
}

export type ToolMode = 'select' | 'add_node' | 'connect' | 'delete';
