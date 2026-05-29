export interface Point {
  x: number;
  y: number;
}

export interface Waypoint {
  id: string;
  x: number;
  y: number;
  label: string;
  isRequired: boolean;
}

export interface NoFlyZone {
  id: string;
  vertices: Point[];
  label: string;
}

export interface WindSegment {
  region: { x: number; y: number; width: number; height: number };
  direction: number;
  speed: number;
}

export interface WindField {
  segments: WindSegment[];
}

export interface ChoiceOption {
  label: string;
  waypoints: Waypoint[];
  windMultiplier: number;
  description: string;
}

export interface ChoicePoint {
  id: string;
  position: Point;
  triggerRadius: number;
  options: ChoiceOption[];
  prompt: string;
}

export interface Level {
  id: string;
  name: string;
  description: string;
  gridSize: { width: number; height: number };
  start: Point;
  home: Point;
  waypoints: Waypoint[];
  noFlyZones: NoFlyZone[];
  windField: WindField;
  choicePoints: ChoicePoint[];
  batteryCapacity: number;
  minReturnBattery: number;
  baseDrainRate: number;
  headwindMultiplier: number;
}

export interface FlightState {
  position: Point;
  heading: number;
  battery: number;
  speed: number;
  currentWaypointIndex: number;
  inNoFlyZone: boolean;
  windAtPosition: { direction: number; speed: number };
  isHeadwind: boolean;
  drainRate: number;
  elapsed: number;
}

export type FlightEventType =
  | 'no_fly_zone_enter'
  | 'no_fly_zone_exit'
  | 'low_battery'
  | 'return_battery_critical'
  | 'choice_point'
  | 'waypoint_reached'
  | 'headwind_start'
  | 'headwind_end'
  | 'all_waypoints_done'
  | 'flight_complete'
  | 'flight_failed';

export interface FlightEvent {
  type: FlightEventType;
  timestamp: number;
  position: Point;
  message: string;
  details: Record<string, number | string | boolean>;
}

export interface FlightSegment {
  fromWaypoint: string;
  toWaypoint: string;
  fromPos: Point;
  toPos: Point;
  distance: number;
  basePowerCost: number;
  windEffect: number;
  actualPowerCost: number;
  isHeadwind: boolean;
  headwindCoefficient: number;
  headwindExplanation: string;
  windChanged: boolean;
  windChangeLabel: string;
}

export interface ScoreItem {
  score: number;
  max: number;
  explanation: string;
}

export interface ScoreBreakdown {
  pathEfficiency: ScoreItem;
  batteryManagement: ScoreItem;
  noFlyZoneCompliance: ScoreItem;
  returnBatteryMargin: ScoreItem;
  headwindHandling: ScoreItem;
  totalScore: number;
  maxTotalScore: number;
}

export interface WindChange {
  segmentIndex: number;
  region: { x: number; y: number; width: number; height: number };
  previousSpeed: number;
  previousDirection: number;
  newSpeed: number;
  newDirection: number;
  affectedFlightSegments: string[];
}

export interface FlightReport {
  levelId: string;
  levelName: string;
  timestamp: string;
  windFieldVersion: number;
  waypoints: Waypoint[];
  plannedWaypoints: Waypoint[];
  segments: FlightSegment[];
  events: FlightEvent[];
  score: ScoreBreakdown;
  batteryRemaining: number;
  flightSuccess: boolean;
  windChanges: WindChange[];
  summaryText: string;
}

export type GamePhase = 'briefing' | 'planning' | 'flying' | 'result';
