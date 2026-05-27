export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  alt: number;
  type: 'airport' | 'waypoint' | 'alternate';
  iataCode?: string;
  isAlternate?: boolean;
}

export interface StormCloud {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radius: number;
  topAlt: number;
  bottomAlt: number;
  intensity: 'light' | 'moderate' | 'severe';
  forecastTime: string;
  dataSource: string;
}

export interface NoFlyZone {
  id: string;
  name: string;
  type: 'restricted' | 'prohibited' | 'danger';
  polygon: Array<{ lat: number; lng: number }>;
  minAlt: number;
  maxAlt: number;
  effectiveFrom: string;
  effectiveTo: string;
  dataSource: string;
}

export interface FlightRoute {
  id: string;
  name: string;
  waypoints: Waypoint[];
  cruiseAlt: number;
  aircraftType: string;
  createdAt: string;
  updatedAt: string;
}

export interface Violation {
  type: 'storm' | 'noflyzone';
  severity: 'warning' | 'danger';
  message: string;
  location?: { lat: number; lng: number };
  affectedSegment?: [number, number];
  stormId?: string;
  zoneId?: string;
}

export interface CollisionResult {
  hasCollision: boolean;
  violations: Violation[];
}

export interface FuelResult {
  totalDistance: number;
  totalFuel: number;
  flightTime: number;
  fuelCapacity: number;
  isOverLimit: boolean;
  reserveFuel: number;
  fuelPerSegment: number[];
  distancePerSegment: number[];
}

export interface FlightReport {
  id: string;
  routeId: string;
  createdAt: string;
  route: FlightRoute;
  collisionResult: CollisionResult;
  fuelResult: FuelResult;
  hasAlternate: boolean;
  recommendations: string[];
  overallStatus: 'safe' | 'warning' | 'danger';
}

export interface HistoryRecord {
  id: string;
  timestamp: string;
  action: 'create' | 'update' | 'delete' | 'save';
  description: string;
  routeSnapshot: FlightRoute;
  operator: string;
  collisionResult?: CollisionResult;
  fuelResult?: FuelResult;
}

export interface AircraftSpec {
  type: string;
  name: string;
  cruiseSpeed: number;
  fuelBurnRate: number;
  fuelCapacity: number;
  maxRange: number;
  maxAltitude: number;
  dataSource: string;
}

export interface AppState {
  currentRoute: FlightRoute | null;
  selectedWaypointId: string | null;
  isEditing: boolean;
  storms: StormCloud[];
  noFlyZones: NoFlyZone[];
  airports: Waypoint[];
  aircraftSpec: AircraftSpec;
  collisionResult: CollisionResult | null;
  fuelResult: FuelResult | null;
  history: HistoryRecord[];
}
