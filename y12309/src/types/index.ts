export type Zone = 'A' | 'B' | 'C' | 'D';
export type WorkOrderType = 'routine' | 'repair' | 'inspection';
export type WorkOrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type WorkOrderSource = 'system' | 'manual';
export type AnomalyType = 'access_closed' | 'route_break' | 'duplicate_inspection';
export type AnomalyLevel = 'high' | 'medium' | 'low';
export type ShiftType = 'morning' | 'afternoon' | 'night';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type LeaveType = 'annual' | 'sick' | 'personal';

export interface Building {
  id: string;
  name: string;
  floor: string;
  zone: Zone;
  x: number;
  y: number;
  accessOpen: boolean;
  accessLastUpdate: string;
  inspectionFrequency: number;
}

export interface RouteEdge {
  id: string;
  fromBuilding: string;
  toBuilding: string;
  distance: number;
  isActive: boolean;
}

export interface Inspector {
  id: string;
  name: string;
  phone: string;
  team: string;
  onDuty: boolean;
  avatarColor: string;
}

export interface WorkOrder {
  id: string;
  buildingId: string;
  inspectorId: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  source: WorkOrderSource;
  scheduledTime: string;
  completedTime?: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export interface Schedule {
  id: string;
  inspectorId: string;
  date: string;
  shift: ShiftType;
  buildingIds: string[];
  isModified: boolean;
  modifiedBy?: string;
  modifiedAt?: string;
}

export interface LeaveRecord {
  id: string;
  inspectorId: string;
  startDate: string;
  endDate: string;
  type: LeaveType;
  status: LeaveStatus;
  reason: string;
}

export interface Anomaly {
  id: string;
  type: AnomalyType;
  level: AnomalyLevel;
  description: string;
  sourceIds: string[];
  sourceTypes: string[];
  detectedAt: string;
  resolved: boolean;
  details: Record<string, unknown>;
}

export interface ChangeLog {
  id: string;
  entityType: string;
  entityId: string;
  field: string;
  oldValue: string;
  newValue: string;
  operator: string;
  timestamp: string;
  reason?: string;
}

export interface RouteGraph {
  nodes: Building[];
  edges: RouteEdge[];
}

export interface BreakpointInfo {
  id: string;
  fromBuilding: string;
  toBuilding: string;
  reason: string;
  affectedRoutes: string[];
}

export interface DuplicateInfo {
  buildingId: string;
  inspectorIds: string[];
  date: string;
  shift: ShiftType;
}
