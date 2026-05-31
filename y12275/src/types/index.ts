export type ConflictType = 'gate_conflict' | 'taxi_crossing' | 'wait_timeout';
export type ConflictSeverity = 'high' | 'medium' | 'low';
export type GateStatus = 'available' | 'occupied' | 'conflict';

export interface Gate {
  id: string;
  name: string;
  position: [number, number, number];
  status: GateStatus;
  aircraft?: string;
  size: 'small' | 'medium' | 'large';
}

export interface Taxiway {
  id: string;
  name: string;
  points: [number, number, number][];
  width: number;
  direction: 'one-way' | 'two-way';
}

export interface DataSource {
  id: string;
  type: 'apron_model' | 'taxiway_data' | 'control_record' | 'report';
  name: string;
  link: string;
  timestamp: string;
}

export interface Conflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  title: string;
  description: string;
  gateIds: string[];
  taxiwayIds: string[];
  startTime: string;
  endTime: string;
  dataSources: DataSource[];
  aircraftInvolved: string[];
}

export interface DataGap {
  id: string;
  type: string;
  description: string;
  affectedAreas: string[];
  severity: 'warning' | 'error';
}

export interface ReportEntry {
  id: string;
  conflictId: string;
  gateRef: string;
  taxiwayRef: string;
  exportTime: string;
}
