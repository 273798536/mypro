export type TemperatureZone = 'frozen' | 'chilled' | 'normal';

export interface CargoBox {
  id: string;
  originalName: string;
  temperatureZone: TemperatureZone;
  originalWeight: string;
  destination: string;
  deliveryOrder: number;
  originalNotes?: string;
}

export interface Compartment {
  id: string;
  originalName: string;
  temperatureZone: TemperatureZone;
  capacity: number;
  originalLocation: string;
  position: { row: number; col: number };
}

export interface Level {
  id: string;
  originalName: string;
  originalDescription: string;
  difficulty: 'easy' | 'medium' | 'hard';
  originalTimeLimit: string;
  timeLimitSeconds: number;
  cargoBoxes: CargoBox[];
  compartments: Compartment[];
  originalRules: string;
}

export interface PlacementRecord {
  cargoBoxId: string;
  compartmentId: string;
  timestamp: number;
  isCorrectZone: boolean;
}

export interface FailureReason {
  type: 'zone_mismatch' | 'delivery_order_blocked' | 'timeout';
  cargoBoxId: string;
  compartmentId?: string;
  blockedBy?: string;
  description: string;
  originalNames: {
    cargoBox: string;
    compartment?: string;
    blockedByBox?: string;
  };
}

export interface GameState {
  levelId: string;
  status: 'idle' | 'playing' | 'paused' | 'completed' | 'failed';
  placements: PlacementRecord[];
  remainingTime: number;
  temperatureHistory: { time: number; temp: number }[];
  failureReasons: FailureReason[];
  operationHistory: {
    action: string;
    timestamp: number;
    details: string;
  }[];
  currentTemperature: number;
}

export interface ExportReport {
  levelOriginalName: string;
  playerName: string;
  completionTime: string;
  totalTimeUsed: number;
  zoneMismatchDetected: boolean;
  zoneMismatchCount: number;
  zoneMismatchDetails: Array<{
    cargoBoxOriginalName: string;
    compartmentOriginalName: string;
    expectedZone: string;
    actualZone: string;
  }>;
  deliveryOrderIssues: FailureReason[];
  timeoutOccurred: boolean;
  temperatureMax: number;
  operationHistory: string[];
}

export interface FeedbackMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
}
