export type ResourceType = 'drone' | 'cleaner' | 'repair';
export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'stormy';
export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished';
export type ResourceStatus = 'available' | 'cooling' | 'working';
export type FaultType = 'panel_dirty' | 'inverter_fault' | 'wire_damage' | 'unknown';
export type FaultPriority = 'low' | 'medium' | 'high' | 'critical';
export type FaultStatus = 'pending' | 'processing' | 'fixed' | 'missed';
export type ActionType = 'inspect' | 'clean' | 'repair';
export type OperationResult = 'success' | 'failed' | 'pending';
export type EventLevel = 'info' | 'warning' | 'danger';
export type EventType = 'weather_change' | 'battery_warning' | 'fault_missed' | 'info' | 'operation';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Area {
  id: string;
  name: string;
  type: 'panel' | 'inverter' | 'substation' | 'road';
  position: Position;
  size: Size;
  status: 'normal' | 'warning' | 'danger';
  cleanliness: number;
}

export interface Resource {
  id: string;
  type: ResourceType;
  name: string;
  status: ResourceStatus;
  cooldownTime: number;
  totalCooldown: number;
  batteryCost: number;
  currentTarget?: string;
  workProgress?: number;
}

export interface Fault {
  id: string;
  areaId: string;
  type: FaultType;
  priority: FaultPriority;
  discoveredAt: number;
  deadline: number;
  status: FaultStatus;
  handledBy?: string;
  handledAt?: number;
  source: string;
  description: string;
}

export interface Correction {
  id: string;
  timestamp: number;
  operator: string;
  reason: string;
  content: string;
}

export interface Operation {
  id: string;
  timestamp: number;
  resourceId: string;
  resourceType: ResourceType;
  targetAreaId: string;
  action: ActionType;
  result: OperationResult;
  source: string;
  remarks?: string;
  corrections?: Correction[];
  faultId?: string;
}

export interface GameEvent {
  id: string;
  timestamp: number;
  type: EventType;
  level: EventLevel;
  title: string;
  message: string;
  acknowledged: boolean;
}

export interface Objective {
  id: string;
  description: string;
  target: number;
  current: number;
  completed: boolean;
}

export interface Level {
  id: string;
  name: string;
  difficulty: Difficulty;
  description: string;
  totalTime: number;
  initialBattery: number;
  batteryDecayRate: number;
  faultFrequency: number;
  weatherChangeRate: number;
  mapLayout: Area[];
  initialFaults: Omit<Fault, 'id' | 'discoveredAt' | 'deadline' | 'status'>[];
  objectives: Omit<Objective, 'current' | 'completed'>[];
  maxFaults: number;
}

export interface ScoreItem {
  category: string;
  description: string;
  points: number;
}

export interface ScoreResult {
  totalScore: number;
  breakdown: ScoreItem[];
}

export interface ReportItem {
  id: string;
  type: string;
  description: string;
  areaId: string;
  areaName: string;
  discoveredAt: number;
  priority: string;
  source: string;
  handler?: string;
  remarks?: string;
}

export interface InspectionReport {
  gameId: string;
  levelName: string;
  startTime: number;
  endTime: number;
  totalScore: number;
  scoreBreakdown: ScoreItem[];
  unhandledItems: ReportItem[];
  correctedItems: ReportItem[];
  needConfirmItems: ReportItem[];
  efficiency: number;
  batteryManagement: number;
  operationLogs: Operation[];
  rating: 'S' | 'A' | 'B' | 'C' | 'D';
}

export interface GameState {
  status: GameStatus;
  level: Level | null;
  currentTime: number;
  totalTime: number;
  score: number;
  battery: number;
  weather: WeatherType;
  weatherForecast: WeatherType[];
  faults: Fault[];
  operations: Operation[];
  events: GameEvent[];
  resources: Resource[];
  objectives: Objective[];
  speedMultiplier: number;
}

export interface ReplayState {
  isReplaying: boolean;
  replayTime: number;
  replayData: GameState[];
  currentFrame: number;
}

export const RESOURCE_CONFIG: Record<ResourceType, { name: string; cooldown: number; batteryCost: number; workTime: number }> = {
  drone: { name: '无人机', cooldown: 30, batteryCost: 5, workTime: 10 },
  cleaner: { name: '清洗队', cooldown: 60, batteryCost: 10, workTime: 20 },
  repair: { name: '维修队', cooldown: 90, batteryCost: 15, workTime: 30 }
};

export const WEATHER_CONFIG: Record<WeatherType, { name: string; icon: string; batteryMultiplier: number; droneAllowed: boolean; description: string }> = {
  sunny: { name: '晴天', icon: '☀️', batteryMultiplier: 1.0, droneAllowed: true, description: '适合飞行，发电效率正常' },
  cloudy: { name: '多云', icon: '⛅', batteryMultiplier: 0.8, droneAllowed: true, description: '可以飞行，发电效率略有下降' },
  rainy: { name: '雨天', icon: '🌧️', batteryMultiplier: 0.5, droneAllowed: false, description: '禁止无人机飞行，发电效率较低' },
  stormy: { name: '暴风雨', icon: '⛈️', batteryMultiplier: 0.3, droneAllowed: false, description: '危险天气，所有户外活动暂停' }
};

export const FAULT_TYPE_CONFIG: Record<FaultType, { name: string; handler: ResourceType; description: string }> = {
  panel_dirty: { name: '光伏板积灰', handler: 'cleaner', description: '光伏板表面积灰，需要清洁' },
  inverter_fault: { name: '逆变器故障', handler: 'repair', description: '逆变器运行异常，需要维修' },
  wire_damage: { name: '线路损坏', handler: 'repair', description: '输电线路损坏，需要维修' },
  unknown: { name: '未知故障', handler: 'drone', description: '需要无人机进一步勘察' }
};

export const PRIORITY_CONFIG: Record<FaultPriority, { name: string; color: string; timeLimit: number }> = {
  low: { name: '低', color: '#10B981', timeLimit: 120 },
  medium: { name: '中', color: '#F59E0B', timeLimit: 90 },
  high: { name: '高', color: '#F97316', timeLimit: 60 },
  critical: { name: '紧急', color: '#EF4444', timeLimit: 30 }
};
