export type SecurityUnitType = 'fixed_post' | 'patrol' | 'emergency_response';

export interface SecurityUnit {
  id: string;
  type: SecurityUnitType;
  name: string;
  capacity: number;
  responseTime: number;
  coverageRadius: number;
}

export type MapElementType = 'stage' | 'exit' | 'entrance' | 'barrier' | 'food' | 'restroom';

export interface MapElement {
  id: string;
  type: MapElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  capacity?: number;
}

export interface FestivalMap {
  id: string;
  name: string;
  width: number;
  height: number;
  elements: MapElement[];
  expectedAttendance: number;
  duration: number;
}

export interface CrowdParticle {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  density: number;
  satisfaction: number;
}

export type EventType = 'exit_congestion' | 'patrol_gap' | 'weather_change' | 
                        'medical_emergency' | 'disturbance' | 'stage_overflow';

export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'heavy_rain' | 'storm';

export interface EventChoice {
  id: string;
  text: string;
  consequence: number;
}

export interface GameEvent {
  id: string;
  type: EventType;
  timestamp: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  dataSourceId: string;
  location?: { x: number; y: number };
  resolved: boolean;
  resolutionTime?: number;
  resolutionAction?: string;
  isDirty?: boolean;
  mergeError?: string;
  expiresAt: number;
  choices: EventChoice[];
}

export type DataSourceType = 'stage_map' | 'patrol_report' | 'security_report' | 'weather_data';

export interface DataSource {
  id: string;
  type: DataSourceType;
  name: string;
  title: string;
  content: string | Record<string, unknown>;
  originalFile: string;
  originalPath?: string;
  hash: string;
  contentHash?: string;
  timestamp: number;
  source?: string;
  summary: string;
  format?: string;
  notes?: string;
  tags?: string[];
  isDirty?: boolean;
  dirtyReason?: string;
}

export interface Deployment {
  id: string;
  gameId: string;
  unitType: SecurityUnitType;
  x: number;
  y: number;
  count: number;
  deployedAt: number;
}

export interface Decision {
  id: string;
  gameId: string;
  action: string;
  timestamp: number;
  dataSourceIds: string[];
  result: string;
  markedCritical: boolean;
}

export interface ScoreBreakdown {
  congestionManagement: number;
  patrolCoverage: number;
  emergencyResponse: number;
  resourceAllocation: number;
  overallSituation: number;
}

export interface Deduction {
  id: string;
  category: keyof ScoreBreakdown;
  points: number;
  reason: string;
  eventId?: string;
  timestamp: number;
}

export interface GameScore {
  id: string;
  gameId: string;
  totalScore: number;
  breakdown: ScoreBreakdown;
  deductions: Deduction[];
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
}

export type GameStatus = 'idle' | 'deploying' | 'running' | 'paused' | 'finished';

export interface GameState {
  id: string;
  mapId: string;
  startTime: number;
  endTime: number;
  status: GameStatus;
  speed: number;
  currentTime: number;
  weather: WeatherCondition;
  crowdParticles: CrowdParticle[];
  deployments: Deployment[];
  events: GameEvent[];
  decisions: Decision[];
  score: GameScore | null;
  congestionIndex: number;
  patrolCoverage: number;
  riskLevel: number;
  snapshots: GameSnapshot[];
}

export interface GameSnapshot {
  timestamp: number;
  congestionIndex: number;
  patrolCoverage: number;
  riskLevel: number;
  weather: WeatherCondition;
  crowdDensity: number[][];
  activeEvents: number;
  deploymentCount: number;
}

export interface GameHistory {
  id: string;
  gameId: string;
  mapName: string;
  startTime: number;
  endTime: number;
  finalScore: number;
  grade: string;
  totalDeductions: number;
  hash: string;
  createdAt: number;
}

export interface GameConfig {
  maxSecurityUnits: number;
  gameDuration: number;
  tickInterval: number;
  eventProbability: number;
}

export const severityToNumber = (severity: string): number => {
  const map: Record<string, number> = {
    low: 1,
    medium: 3,
    high: 4,
    critical: 5
  };
  return map[severity] || 1;
};

export const numberToSeverity = (num: number): 'low' | 'medium' | 'high' | 'critical' => {
  if (num <= 2) return 'low';
  if (num === 3) return 'medium';
  if (num === 4) return 'high';
  return 'critical';
};
