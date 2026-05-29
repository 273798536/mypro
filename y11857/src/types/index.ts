export interface StationFloor {
  id: string;
  name: string;
  level: number;
  height: number;
  color: string;
  boundaries: { x: number; y: number }[];
  escalators: Escalator[];
  gates: Gate[];
  barriers: Barrier[];
  walkways: Walkway[];
}

export interface Escalator {
  id: string;
  name: string;
  fromFloor: number;
  toFloor: number;
  position: { x: number; y: number; z: number };
  direction: 'up' | 'down' | 'bidirectional';
  capacity: number;
  maxCapacity: number;
  status: 'normal' | 'warning' | 'error';
}

export interface Gate {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  passRate: number;
  maxPassRate: number;
}

export interface Barrier {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  width: number;
  active: boolean;
}

export interface Walkway {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  width: number;
  flowDirection: 'forward' | 'backward' | 'both';
}

export interface PassengerFlow {
  id: string;
  origin: string;
  destination: string;
  path: { x: number; y: number; z: number; timestamp: number }[];
  currentPosition: { x: number; y: number; z: number };
  status: 'moving' | 'waiting' | 'blocked';
}

export interface Bottleneck {
  id: string;
  location: { x: number; y: number; z: number };
  floor: number;
  type: 'escalator' | 'gate' | 'walkway' | 'corner';
  severity: 'low' | 'medium' | 'high' | 'critical';
  waitingCount: number;
  relatedFacilityId?: string;
}

export type IssueType = 'escalator_capacity' | 'barrier_inactive' | 'flow_reflux' | 'data_missing';
export type IssueSeverity = 'warning' | 'error' | 'critical';
export type IssueStatus = 'open' | 'in_progress' | 'resolved';

export interface Issue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  title: string;
  description: string;
  floor?: number;
  facilityId?: string;
  responsiblePerson: string;
  documentPath: string;
  status: IssueStatus;
  createdAt: Date;
  parameterSnapshot?: Record<string, any>;
}

export interface ViewPreset {
  id: string;
  name: string;
  cameraPosition: { x: number; y: number; z: number };
  cameraTarget: { x: number; y: number; z: number };
  visibleFloors: number[];
  createdAt: Date;
}

export interface ValidationResult {
  valid: boolean;
  level: 'normal' | 'warning' | 'error' | 'critical';
  message: string;
}

export interface DataValidationReport {
  isValid: boolean;
  missingFields: { field: string; location: string; suggestion: string }[];
  warnings: string[];
  escalatorIssues: number;
  gateIssues: number;
}

export interface AnalysisReport {
  generatedAt: Date;
  stationName: string;
  coreConclusion: {
    escalatorCapacityBlocked: boolean;
    blockedCount: number;
    totalEscalators: number;
    dataIntegrityScore: number;
  };
  issues: Issue[];
  bottlenecks: Bottleneck[];
  parameterSnapshot: {
    escalatorCapacities: Record<string, number>;
    gateRates: Record<string, number>;
    activeBarriers: string[];
  };
  recommendations: string[];
}

export const ESCALATOR_CAPACITY_RANGE = {
  min: 20,
  max: 120,
  warningThreshold: 0.8,
  errorThreshold: 1.0
};

export const GATE_PASS_RATE_RANGE = {
  min: 10,
  max: 60
};
