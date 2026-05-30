export interface Turbine {
  id: string;
  x: number;
  y: number;
  hubHeight: number;
  rotorDiameter: number;
  model: string;
}

export interface CableRoute {
  id: string;
  voltage: string;
  waypoints: [number, number][];
  color: string;
}

export interface PowerRecord {
  turbineId: string;
  timestamp: number;
  powerOutput: number;
  windSpeed: number;
  windDirection: number;
}

export interface MaintenancePlan {
  vesselId: string;
  turbineId: string;
  startTime: number;
  endTime: number;
  taskType: string;
}

export interface WindCondition {
  timestamp: number;
  speed: number;
  direction: number;
}

export interface Scheme {
  id: string;
  name: string;
  turbines: Turbine[];
  cables: CableRoute[];
}

export interface WakeResult {
  turbineId: string;
  deficit: number;
  affectedBy: string[];
  overlapZone: { x: number; y: number; radius: number }[];
}

export interface CableCrossing {
  point: [number, number];
  cable1Id: string;
  cable2Id: string;
  segment1Index: number;
  segment2Index: number;
}

export interface MaintenanceConflict {
  vessel1Id: string;
  vessel2Id: string;
  turbine1Id: string;
  turbine2Id: string;
  overlapStart: number;
  overlapEnd: number;
}
