export interface Coordinate {
  x: number;
  y: number;
}

export interface ResidentPoint {
  id: string;
  name: string;
  coordinate: Coordinate;
  population: number;
  weight?: number;
  tags?: string[];
}

export interface FacilityCandidate {
  id: string;
  name: string;
  coordinate: Coordinate;
  type: 'hospital' | 'school' | 'community_center' | 'other';
  capacity?: number;
  existing?: boolean;
}

export interface RoadNode {
  id: string;
  coordinate: Coordinate;
  type?: 'intersection' | 'endpoint' | 'normal';
}

export interface RoadEdge {
  id: string;
  from: string;
  to: string;
  length: number;
  type?: 'main' | 'secondary' | 'alley';
  walkable?: boolean;
}

export interface RoadNetwork {
  nodes: RoadNode[];
  edges: RoadEdge[];
}

export interface ServiceRadiusConfig {
  type: string;
  radius: number;
  unit: 'meter' | 'minute';
  walkSpeed?: number;
}

export interface CoverageResult {
  residentId: string;
  covered: boolean;
  distance: number;
  nearestFacilityId: string | null;
  nearestFacilityDistance: number;
  allFacilities: Array<{
    facilityId: string;
    distance: number;
    withinRadius: boolean;
  }>;
}

export interface FairnessMetrics {
  coverageRate: number;
  coveredPopulation: number;
  totalPopulation: number;
  populationCoverageRate: number;
  giniCoefficient: number;
  theilIndex: number;
  averageDistance: number;
  maxDistance: number;
  minDistance: number;
  distanceStdDev: number;
}

export interface BlindArea {
  id: string;
  residentIds: string[];
  population: number;
  centerCoordinate: Coordinate;
  reason: 'no_facility' | 'distance_too_far' | 'network_disconnected';
  severity: 'high' | 'medium' | 'low';
}

export type ResultCategory = 'usable' | 'needs_confirmation' | 'radius_too_short';

export interface ValidationIssue {
  type: 'network_breakpoint' | 'duplicate_population' | 'radius_too_short' | 'missing_data';
  severity: 'error' | 'warning' | 'info';
  message: string;
  details?: Record<string, unknown>;
}

export interface OptimizationResult {
  category: ResultCategory;
  coverageResults: CoverageResult[];
  fairnessMetrics: FairnessMetrics;
  blindAreas: BlindArea[];
  validationIssues: ValidationIssue[];
  calculationMetadata: CalculationMetadata;
  changesFromPrevious?: ChangeSummary;
}

export interface CalculationMetadata {
  algorithm: string;
  formula: string;
  calculationTime: number;
  timestamp: Date;
  parameters: Record<string, unknown>;
}

export interface ChangeSummary {
  changedResidentIds: string[];
  changedCount: number;
  previousRadius: number;
  newRadius: number;
  changes: Array<{
    residentId: string;
    previous: {
      covered: boolean;
      distance: number;
    };
    current: {
      covered: boolean;
      distance: number;
    };
  }>;
}

export interface SelectionReport {
  recommendedFacilities: string[];
  analysis: string;
  suggestions: string[];
  dataSources: string[];
}
