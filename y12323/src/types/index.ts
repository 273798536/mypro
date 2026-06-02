export interface Employee {
  id: string;
  name: string;
  department: string;
  address: string;
  latitude: number;
  longitude: number;
  status: 'active' | 'inactive' | 'missing_data';
  remark: string;
  isLateSupplement: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Station {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
  status: 'candidate' | 'selected' | 'closed';
  remark: string;
}

export interface Assignment {
  id: string;
  employeeId: string;
  stationId: string;
  planId: string;
  distance: number;
  routeOrder: number;
}

export interface SchedulePlan {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'completed' | 'failed';
  createdAt: string;
  parameters: {
    maxWalkingDistance: number;
    minStationEmployees: number;
    costPerStation: number;
  };
  totalCost: number;
  totalEmployees: number;
  assignments: Assignment[];
  isFeasible: boolean;
  isOptimal: boolean;
  optimalityGap: number;
  stationCost: number;
  distanceCost: number;
  solveTimeMs: number;
  nodesExplored: number;
  unassignedEmployees: string[];
  alternativePlans: AlgorithmResult[];
}

export interface OverflowRecord {
  id: string;
  planId: string;
  stationId: string;
  overflowCount: number;
  createdAt: string;
  remark: string;
  isResolved: boolean;
}

export interface AlgorithmResult {
  planId: string;
  selectedStations: string[];
  assignments: Assignment[];
  totalCost: number;
  totalDistance: number;
  overflowRecords: OverflowRecord[];
}
