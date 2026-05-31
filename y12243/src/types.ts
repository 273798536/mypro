export interface Spacecraft {
  id: string;
  name: string;
  status: 'in_orbit' | 'de_orbit' | 'window_standby';
  fuelBudget: number;
  fuelUsed: number;
  orbitCount: number;
}

export interface OrbitRing {
  id: string;
  name: string;
  fuelCost: number;
  thrustGain: number;
  windowOpen: string;
  windowClose: string;
  isAssigned: boolean;
  assignedTo?: string;
  altitude: number;
}

export type FlightLogEventType = 'allocation' | 'fuel_settlement' | 'window_miss' | 'orbit_intersection' | 'note';

export interface FlightLog {
  id: string;
  spacecraftId: string;
  orbitRingId?: string;
  eventType: FlightLogEventType;
  description: string;
  timestamp: string;
  hasMissingField: boolean;
  isLateEntry: boolean;
  isNoteModified: boolean;
  noteOriginal?: string;
}

export interface MissionResult {
  id: string;
  spacecraftId: string;
  totalScore: number;
  orbitScore: number;
  fuelScore: number;
  status: 'success' | 'partial' | 'failed';
}

export type ViolationRuleType = 'orbit_propulsion' | 'fuel_settlement' | 'window_rule';

export interface Violation {
  id: string;
  missionResultId: string;
  ruleType: ViolationRuleType;
  ruleName: string;
  description: string;
  spacecraftId: string;
  orbitRingId?: string;
  isOverridden: boolean;
}
