export type RadiationLevel = 'green' | 'yellow' | 'red';

export interface GallerySegment {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  radiationZone: RadiationLevel;
}

export interface Valve {
  valveId: string;
  position: [number, number, number];
  galleryId: string;
  indexInGallery: number;
}

export interface InspectionRoute {
  routeId: string;
  valveSequence: string[];
}

export type WorkOrderStatus = 'completed' | 'in_progress' | 'overdue';

export interface WorkOrder {
  workOrderId: string;
  valveRef: string;
  status: WorkOrderStatus;
  dueDate: string;
}

export interface RadiationZone {
  zoneId: string;
  zoneName: string;
  level: RadiationLevel;
  bounds: { min: [number, number, number]; max: [number, number, number] };
}

export interface DuplicateValveIssue {
  type: 'duplicate_valve';
  valveId: string;
  valves: Valve[];
}

export interface RouteCrossZoneIssue {
  type: 'route_cross_zone';
  routeId: string;
  fromZone: RadiationLevel;
  toZone: RadiationLevel;
  fromValve: string;
  toValve: string;
  severity: 'warning' | 'critical';
}

export interface OverdueWorkOrderIssue {
  type: 'overdue_workorder';
  workOrderId: string;
  valveRef: string;
  dueDate: string;
  overdueDays: number;
}

export type Issue = DuplicateValveIssue | RouteCrossZoneIssue | OverdueWorkOrderIssue;

export interface AnalysisReport {
  generatedAt: string;
  summary: {
    totalValves: number;
    duplicateValveGroups: number;
    duplicateValveIds: string[];
    routeCrossZoneIssues: number;
    crossZoneRoutes: string[];
    overdueWorkOrders: number;
    overdueWorkOrderIds: string[];
  };
  duplicateValveDetails: DuplicateValveIssue[];
  routeCrossZoneDetails: RouteCrossZoneIssue[];
  overdueWorkOrderDetails: OverdueWorkOrderIssue[];
}
