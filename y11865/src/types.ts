export interface FireStation {
  id: string;
  name: string;
  position: [number, number, number];
  responseTime: number;
  vehicles: number;
}

export interface Building {
  id: string;
  name: string;
  position: [number, number, number];
  height: number;
  population: number;
  type: 'residential' | 'commercial' | 'industrial';
}

export interface RoadNode {
  id: string;
  position: [number, number];
}

export interface RoadEdge {
  id: string;
  from: string;
  to: string;
  distance: number;
  speedLimit: number;
  isBlocked: boolean;
}

export interface CoverageResult {
  buildingId: string;
  responseTime: number;
  fireStationId: string;
  isBlind: boolean;
}

export interface Alert {
  id: string;
  type: 'parameter' | 'data' | 'calculation';
  severity: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
}

export interface Simulation {
  id: string;
  name: string;
  createdAt: number;
  parameters: {
    responseThreshold: number;
    speedCoefficient: number;
  };
  fireStations: FireStation[];
  buildings: Building[];
  roadNodes: RoadNode[];
  roadEdges: RoadEdge[];
  results: CoverageResult[];
  alerts: Alert[];
}

export interface SimulationComparison {
  changedBuildings: string[];
  responseTimeDiff: Map<string, number>;
  newBlindSpots: string[];
  resolvedBlindSpots: string[];
}

export interface TimePoint {
  hour: number;
  speedMultiplier: number;
  trafficVolume: number;
}
