
export interface Drone {
  id: string;
  name: string;
  maxBattery: number;
  cruiseSpeed: number;
  baseConsumption: number;
}

export interface Waypoint {
  id: string;
  x: number;
  y: number;
  name: string;
  type: 'start' | 'checkpoint' | 'end';
  order: number;
}

export type WindType = 'headwind' | 'tailwind' | 'crosswind' | 'calm';

export interface WindZone {
  id: string;
  x: number;
  y: number;
  radius: number;
  direction: number;
  speed: number;
  type: WindType;
  color: string;
}

export interface EnergyLog {
  timestamp: number;
  battery: number;
  consumption: number;
  windType: WindType;
  windSpeed: number;
  position: { x: number; y: number };
}

export type ViolationType = 
  | 'headwind_ignored' 
  | 'inefficient_path' 
  | 'insufficient_return' 
  | 'no_fly_zone' 
  | 'missing_field' 
  | 'late_entry';

export interface Violation {
  id: string;
  type: ViolationType;
  description: string;
  penalty: number;
  ruleReference: string;
  timestamp: number;
  highlighted: boolean;
}

export interface RemarkChange {
  oldRemark: string;
  newRemark: string;
  modifiedAt: string;
}

export interface DataCorrection {
  id: string;
  flightId: string;
  fieldName: string;
  oldValue: any;
  newValue: any;
  reason: string;
  correctedAt: string;
  affectedDetails: string[];
}

export type FlightStatus = 'planning' | 'flying' | 'completed' | 'failed';

export interface FlightRecord {
  id: string;
  droneId: string;
  pilotName: string;
  startTime: string;
  endTime: string | null;
  startBattery: number;
  endBattery: number | null;
  waypoints: Waypoint[];
  energyLogs: EnergyLog[];
  violations: Violation[];
  score: number;
  status: FlightStatus;
  createdAt: string;
  updatedAt: string;
  remark: string;
  hasMissingFields: boolean;
  missingFields: string[];
  isLateEntry: boolean;
  lateEntryHours?: number;
  remarkModified: boolean;
  remarkHistory: RemarkChange[];
  corrections: DataCorrection[];
}

export interface GameState {
  currentPosition: { x: number; y: number };
  currentBattery: number;
  currentWaypointIndex: number;
  isFlying: boolean;
  speed: number;
  currentWind: WindType;
  windSpeed: number;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  penalty: number;
  category: 'path' | 'wind' | 'energy' | 'data';
}
