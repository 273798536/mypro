export type PackageType = 'normal' | 'urgent' | 'damaged';
export type PackagePriority = 1 | 2 | 3 | 4 | 5;
export type PackageDestination = 'A' | 'B' | 'C';
export type PackageStatus = 'waiting' | 'processing' | 'completed' | 'failed';
export type LineStatus = 'idle' | 'busy' | 'blocked';
export type GameStatus = 'idle' | 'playing' | 'paused' | 'ended' | 'reviewing';
export type QueueStrategy = 'fifo' | 'priority' | 'sjf';
export type PathStrategy = 'round-robin' | 'shortest-queue' | 'destination-match';
export type EventType = 'package_created' | 'package_assigned' | 'package_started' | 
                      'package_completed' | 'package_failed' | 'line_blocked' | 
                      'line_unblocked' | 'strategy_changed' | 'exception_detected' | 'game_started' | 'game_paused' | 'game_ended';
export type ExceptionType = 'urgent_starvation' | 'line_congestion' | 'damaged_failure' | 'deadline_missed';

export interface Package {
  id: string;
  type: PackageType;
  priority: PackagePriority;
  destination: PackageDestination;
  processingTime: number;
  deadline: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  status: PackageStatus;
  assignedLine?: number;
  progress: number;
}

export interface SortingLine {
  id: number;
  name: string;
  color: string;
  destination: PackageDestination;
  capacity: number;
  currentLoad: number;
  queue: Package[];
  currentPackage?: Package;
  status: LineStatus;
  blockedUntil: number;
}

export interface Score {
  base: number;
  bonus: number;
  penalty: number;
  total: number;
}

export interface GameEvent {
  id: string;
  timestamp: number;
  type: EventType;
  data: Record<string, any>;
}

export interface GameException {
  id: string;
  type: ExceptionType;
  timestamp: number;
  description: string;
  involvedPackageIds: string[];
  involvedLineIds: number[];
  penalty: number;
  resolved: boolean;
  resolvedAt?: number;
}

export interface GameConfig {
  duration: number;
  packageInterval: [number, number];
  urgentRatio: number;
  damagedRatio: number;
  destinations: PackageDestination[];
  priorityWeights: [number, number, number, number, number];
  processingTimeRange: [number, number];
  deadlineRange: [number, number];
  lineCapacity: number;
  starvationThreshold: number;
  congestionThreshold: number;
}

export interface GameState {
  status: GameStatus;
  time: number;
  duration: number;
  speed: number;
  score: Score;
  packages: Package[];
  sortingLines: SortingLine[];
  queueStrategy: QueueStrategy;
  pathStrategy: PathStrategy;
  events: GameEvent[];
  exceptions: GameException[];
  config: GameConfig;
  selectedPackageId?: string;
  reviewTime?: number;
}

export interface PresetScene {
  id: string;
  name: string;
  description: string;
  config: GameConfig;
  algorithm: string;
  teachingPoint: string;
}
