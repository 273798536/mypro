export type RecordStatus = 'normal' | 'warning' | 'error';

export type DoorStatus = 'open' | 'closed';

export interface TunnelNode {
  id: string;
  position: [number, number, number];
  connections: string[];
  isWall?: boolean;
}

export interface TunnelSegment {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  width: number;
  height: number;
}

export interface AirDoor {
  id: string;
  nodeId: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  status: DoorStatus;
  expectedStatus: DoorStatus;
  name: string;
}

export interface SmokeSource {
  id: string;
  position: [number, number, number];
  intensity: number;
  name: string;
  reverseFlow?: boolean;
}

export interface Person {
  id: string;
  position: [number, number, number];
  name: string;
}

export interface WindFlow {
  nodeId: string;
  direction: [number, number, number];
  speed: number;
}

export interface EscapeRoute {
  id: string;
  personId: string;
  points: [number, number, number][];
  isValid: boolean;
  wallCrossings: number[];
}

export type AlertType = 'door_error' | 'smoke_reverse' | 'route_cross_wall';

export interface Alert {
  id: string;
  type: AlertType;
  severity: 'warning' | 'error';
  message: string;
  position?: [number, number, number];
  objectId?: string;
  suggestion: string;
}

export interface Revision {
  id: string;
  timestamp: string;
  author: string;
  field: string;
  oldValue: string;
  newValue: string;
  reason: string;
}

export interface DrillRecord {
  id: string;
  name: string;
  status: RecordStatus;
  date: string;
  source: string;
  airDoors: AirDoor[];
  smokeSources: SmokeSource[];
  persons: Person[];
  windFlows: WindFlow[];
  escapeRoutes: EscapeRoute[];
  alerts: Alert[];
  revisionHistory: Revision[];
}

export interface SelectedObject {
  type: 'door' | 'smoke' | 'person' | 'route';
  id: string;
  position: [number, number, number];
}
