export type NodeType = 'corridor' | 'equipment_room' | 'pipe_well' | 'entrance' | 'junction' | 'stairwell';

export type PathStatus = 'open' | 'closed' | 'access_issue' | 'under_maintenance';

export type AnomalyType = 'access_failed' | 'path_closed' | 'floor_mismatch' | 'bad_row' | 'missing_data';

export interface SpaceNode {
  id: string;
  name: string;
  type: NodeType;
  x: number;
  y: number;
  z: number;
  floor: number;
  description?: string;
  building?: string;
}

export interface PathEdge {
  id: string;
  from: string;
  to: string;
  distance: number;
  status: PathStatus;
  accessControl?: boolean;
  description?: string;
}

export interface WorkOrder {
  id: string;
  title: string;
  locationId: string;
  status: 'pending' | 'in_progress' | 'completed';
  createTime: Date;
  priority: 'low' | 'medium' | 'high';
  description?: string;
}

export interface Anomaly {
  id: string;
  type: AnomalyType;
  description: string;
  pathId?: string;
  nodeId?: string;
  resolved: boolean;
  source?: string;
  rawData?: string;
}

export interface PlannedPath {
  nodes: string[];
  edges: string[];
  totalDistance: number;
  estimatedTime: number;
  hasAnomalies: boolean;
}

export interface TimePoint {
  id: string;
  name: string;
  timestamp: Date;
  description: string;
}
