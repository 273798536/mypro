export interface Station {
  id: string;
  name: string;
  x: number;
  y: number;
  isBlocked: boolean;
  passengerFlow: number;
}

export interface Route {
  id: string;
  name: string;
  color: string;
  stations: string[];
  originalStations: string[];
  vehicles: string[];
  interval: number;
  status: 'normal' | 'detoured' | 'suspended';
}

export interface Vehicle {
  id: string;
  routeId: string;
  plateNumber: string;
  currentStationIndex: number;
  nextStationTime: number;
  passengers: number;
  capacity: number;
  status: 'running' | 'stopped' | 'delayed';
  delayTime: number;
  progress: number;
}

export interface GameEvent {
  id: string;
  type: 'roadblock' | 'peak' | 'accident' | 'weather';
  title: string;
  description: string;
  affectedArea: string[];
  startTime: number;
  duration: number;
  severity: 'low' | 'medium' | 'high';
  resolved: boolean;
}

export interface Anomaly {
  id: string;
  type: 'skip_station' | 'interval_imbalance' | 'detour_timeout' | 'overcrowding';
  routeId: string;
  stationId?: string;
  vehicleId?: string;
  timestamp: number;
  scoreImpact: number;
  description: string;
  resolved: boolean;
}

export interface ActionRecord {
  id: string;
  type: 'reroute' | 'dispatch' | 'adjust_interval' | 'suspend' | 'resume';
  timestamp: number;
  description: string;
  details: Record<string, unknown>;
}

export interface ScoreBreakdown {
  punctuality: { score: number; maxScore: number; details: string[] };
  coverage: { score: number; maxScore: number; details: string[] };
  satisfaction: { score: number; maxScore: number; details: string[] };
  efficiency: { score: number; maxScore: number; details: string[] };
  response: { score: number; maxScore: number; details: string[] };
  penalties: { total: number; details: string[] };
}

export interface GameState {
  status: 'idle' | 'playing' | 'paused' | 'ended';
  gameTime: number;
  realTime: number;
  speed: number;
  totalScore: number;
  satisfaction: number;
  stations: Station[];
  routes: Route[];
  vehicles: Vehicle[];
  events: GameEvent[];
  anomalies: Anomaly[];
  actionLog: ActionRecord[];
  scoreBreakdown: ScoreBreakdown;
  level: number;
  gameDuration: number;
  stats: GameStats;
}

export interface GameStats {
  totalArrivals: number;
  onTimeArrivals: number;
  totalStopsServed: number;
  totalStopsMissed: number;
  totalPassengersServed: number;
  totalComplaints: number;
  eventsHandled: number;
  eventsMissed: number;
  detourDistance: number;
  normalDistance: number;
}

export interface Level {
  id: number;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  stations: Station[];
  routes: Route[];
  vehicles: Vehicle[];
  eventSchedule: Omit<GameEvent, 'id' | 'resolved'>[];
  duration: number;
  targetScore: number;
}
