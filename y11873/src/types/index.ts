export interface Supply {
  id: string;
  type: string;
  name: string;
  quantity: number;
  unit: string;
  warehouseId: string;
}

export interface Warehouse {
  id: string;
  name: string;
  position: [number, number, number];
  elevation: number;
  supplies: Supply[];
  serviceRadius: number;
  status: 'normal' | 'isolated' | 'overloaded';
}

export interface Road {
  id: string;
  name: string;
  waypoints: [number, number, number][];
  slopeAngle: number;
  status: 'open' | 'interrupted' | 'slope_limited';
  interruptReason?: string;
  slopeLimitedReason?: string;
  connectedWarehouseIds: string[];
}

export interface ImportBatch {
  id: string;
  timestamp: number;
  type: 'warehouse' | 'supply' | 'road';
  label: string;
  dataCount: number;
}

export interface ConflictAlert {
  id: string;
  type: 'road_interrupted' | 'supply_duplicate' | 'slope_miscalculated';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  reason: string;
  relatedIds: string[];
  position?: [number, number, number];
}

export interface FilterState {
  supplyTypes: string[];
  warehouseStatuses: ('normal' | 'isolated' | 'overloaded')[];
  roadStatuses: ('open' | 'interrupted' | 'slope_limited')[];
}
