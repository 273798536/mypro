export type ModuleStatus = 'normal' | 'damaged' | 'critical' | 'repaired';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type SkillLevel = 'basic' | 'advanced' | 'expert';
export type StaffStatus = 'idle' | 'working' | 'resting' | 'exhausted';
export type ShiftType = 'day' | 'night';
export type PowerNodeStatus = 'online' | 'offline' | 'overloaded';
export type AlertType = 'oxygen' | 'power' | 'fatigue' | 'conflict' | 'timeout';
export type AlertSeverity = 'warning' | 'critical';
export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished';
export type GameSpeed = 1 | 2 | 4;
export type DecisionType = 'assign' | 'cancel' | 'reassign';

export interface Module {
  id: string;
  name: string;
  position: { x: number; y: number };
  connections: string[];
  status: ModuleStatus;
  oxygenConsumption: number;
  powerConsumption: number;
  hasPowerNode: boolean;
  powerNodeId?: string;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  moduleId: string;
  priority: TaskPriority;
  duration: number;
  requiredStaff: number;
  requiredSkill: SkillLevel;
  deadline: number;
  status: TaskStatus;
  assignedStaff: string[];
  startTime?: number;
  powerNodeImpact?: { nodeId: string; affected: boolean };
}

export interface Staff {
  id: string;
  name: string;
  skill: SkillLevel;
  fatigue: number;
  maxFatigue: number;
  shift: ShiftType;
  shiftStart: number;
  shiftEnd: number;
  status: StaffStatus;
  currentTaskId?: string;
}

export interface PowerNode {
  id: string;
  name: string;
  moduleId: string;
  capacity: number;
  currentLoad: number;
  affectedModules: string[];
  status: PowerNodeStatus;
}

export interface Resources {
  oxygen: number;
  maxOxygen: number;
  oxygenConsumptionRate: number;
  power: number;
  maxPower: number;
  powerGenerationRate: number;
  time: number;
  maxTime: number;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: number;
  penalty: number;
  relatedTaskId?: string;
  relatedStaffId?: string;
  relatedModuleId?: string;
}

export interface GameSnapshot {
  timestamp: number;
  resources: Resources;
  modules: Module[];
  tasks: Task[];
  staff: Staff[];
  alerts: Alert[];
  score: number;
}

export interface DecisionRecord {
  id: string;
  timestamp: number;
  type: DecisionType;
  taskId: string;
  staffIds: string[];
  efficiency: number;
}

export interface GameState {
  status: GameStatus;
  speed: GameSpeed;
  resources: Resources;
  modules: Module[];
  tasks: Task[];
  staff: Staff[];
  powerNodes: PowerNode[];
  alerts: Alert[];
  snapshots: GameSnapshot[];
  score: number;
  penalties: Alert[];
  decisions: DecisionRecord[];
  hasPowerNodes: boolean;
  seed: number;
  selectedTaskId: string | null;
}
