export interface PipeNode {
  id: string;
  position: [number, number, number];
  label?: string;
}

export interface PipeSegment {
  id: string;
  fromNode: string;
  toNode: string;
  diameter: number;
  material: string;
  basePressure: number;
  currentPressure: number;
  source: string;
  corrections: CorrectionRecord[];
  isClosedLoop: boolean;
  dataQuality: 'good' | 'boundary' | 'bad';
}

export interface Valve {
  id: string;
  position: [number, number, number];
  isOpen: boolean;
  pipeSegmentId: string;
  isSaved: boolean;
  lastModified: number;
}

export interface PumpStation {
  id: string;
  position: [number, number, number];
  supplyPressure: number;
  status: 'running' | 'standby' | 'fault';
  name: string;
}

export interface UserArea {
  id: string;
  name: string;
  position: [number, number, number];
  minPressure: number;
  maxPressure: number;
  currentPressure: number;
}

export interface DispatchRecord {
  id: string;
  timestamp: number;
  valveId: string;
  valveName: string;
  action: 'open' | 'close';
  operator: string;
  notes: string;
  beforePressure: number;
  afterPressure: number;
}

export interface CorrectionRecord {
  id: string;
  timestamp: number;
  field: string;
  oldValue: string;
  newValue: string;
  operator: string;
  reason: string;
}

export interface AnomalyItem {
  id: string;
  type: 'closed_loop' | 'low_pressure' | 'unsaved_state' | 'bad_data';
  severity: 'high' | 'medium' | 'low';
  location: string;
  locationId: string;
  message: string;
  suggestion: string;
  timestamp: number;
  acknowledged: boolean;
}

export interface ReportData {
  periodStart: number;
  periodEnd: number;
  dispatchRecords: DispatchRecord[];
  anomalies: AnomalyItem[];
  pressureSummary: {
    min: number;
    max: number;
    avg: number;
    segments: number;
  };
  corrections: CorrectionRecord[];
}
