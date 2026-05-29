export interface Station {
  id: string;
  name: string;
  x: number;
  y: number;
  passengerFlow: number;
  maxCapacity: number;
  isTransfer: boolean;
  connectedLines: string[];
  consecutiveOverload: number;
}

export interface BusLine {
  id: string;
  name: string;
  color: string;
  stations: string[];
  interval: number;
  firstBus: string;
  lastBus: string;
}

export interface Bus {
  id: string;
  lineId: string;
  plateNumber: string;
  driverName: string;
  currentStationIndex: number;
  direction: 'forward' | 'backward';
  status: 'running' | 'stopped' | 'broken';
  passengerCount: number;
  maxPassengers: number;
  continuousDriving: number;
  lastDepartureTime: number;
  isOnTime: boolean;
}

export interface Decision {
  id: string;
  round: number;
  type: 'dispatch' | 'reroute' | 'hold' | 'break';
  busId: string;
  description: string;
  timestamp: number;
}

export interface Anomaly {
  id: string;
  type: 'clustering' | 'overtime' | 'transfer_gap' | 'overload';
  severity: 'warning' | 'critical';
  description: string;
  responsibleRole: string;
  busIds: string[];
  stationId?: string;
  suggestion: string;
  resolved: boolean;
  roundDetected: number;
}

export interface DataValidationIssue {
  field: string;
  type: 'missing' | 'invalid';
  message: string;
  suggestion: string;
}

export interface ImportResult<T> {
  success: boolean;
  data?: T;
  issues: DataValidationIssue[];
}

export interface GameState {
  currentRound: number;
  maxRounds: number;
  timeOfDay: number;
  score: number;
  stations: Station[];
  lines: BusLine[];
  buses: Bus[];
  anomalies: Anomaly[];
  decisions: Decision[];
  isRoadClosed: boolean;
  closedStationId: string | null;
  totalPassengersTransported: number;
  onTimeDepartures: number;
  totalDepartures: number;
  gamePhase: 'setup' | 'playing' | 'ended';
}

export interface ReportData {
  finalScore: number;
  passengerFlowRate: number;
  onTimeRate: number;
  anomalyResolutionRate: number;
  anomalies: Anomaly[];
  decisions: Decision[];
  suggestions: string[];
  isWin: boolean;
}
