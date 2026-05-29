export type DateType = 'workday' | 'weekend' | 'event';
export type BlockageStatus = 'normal' | 'slow' | 'blocked';
export type OverflowStatus = 'normal' | 'overflow' | 'full';
export type HandlingMethod = 'default' | 'interpolate' | 'ignore' | 'flag';
export type ScenarioType = 'smooth' | 'blocked' | 'full' | 'event';

export interface FloorData {
  id: string;
  floorNumber: number;
  totalSpots: number;
  occupiedSpots: number;
  pressureLevel: number;
  overflowStatus: OverflowStatus;
  notes?: string;
  _dirty?: boolean;
}

export interface EntranceData {
  id: string;
  entranceName: string;
  incomingCars: number;
  queueLength: number;
  pressureLevel: number;
  blockageStatus: BlockageStatus;
  notes?: string;
  _dirty?: boolean;
}

export interface AnomalyNote {
  id: string;
  type: 'null' | 'anomaly' | 'remark';
  fieldName: string;
  originalValue: string | number | null | undefined;
  handledValue: string | number | null;
  handlingMethod: HandlingMethod;
}

export interface ParkingRecord {
  id: string;
  timestamp: string;
  hourOfDay: number;
  dateType: DateType;
  source?: string;
  remarks?: string;
  floors: FloorData[];
  entrances: EntranceData[];
  anomalies: AnomalyNote[];
  _dataQuality: number;
}

export interface ExplanationResult {
  id: string;
  recordId: string;
  overallPressure: number;
  peakPeriod: string;
  primaryCause: string;
  timeContribution: number;
  floorContribution: number;
  entranceContribution: number;
  eventContribution: number;
  naturalLanguageExplanation: string;
  contributingFactors: Array<{
    name: string;
    value: number;
    description: string;
  }>;
  causeChain: string[];
}

export interface DemoScenario {
  id: string;
  name: string;
  type: ScenarioType;
  description: string;
  data: ParkingRecord[];
}

export interface TimelineState {
  currentHour: number;
  isPlaying: boolean;
  playbackSpeed: number;
  minHour: number;
  maxHour: number;
}

export interface FilterState {
  dateType: DateType | 'all';
  selectedFloors: number[];
  selectedEntrances: string[];
}

export interface ParkingState {
  records: ParkingRecord[];
  currentRecord: ParkingRecord | null;
  explanation: ExplanationResult | null;
  timeline: TimelineState;
  filters: FilterState;
  currentScenario: DemoScenario | null;
  isLoading: boolean;
}
