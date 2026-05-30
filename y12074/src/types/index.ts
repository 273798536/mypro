import { Vector3 } from 'three';

export type LuggageStatus = 'normal' | 'height_mismatch' | 'speed_over' | 'stacked';

export type AnomalyType = 'height_mismatch' | 'speed_over' | 'stacked';

export type BadRowType = 'empty' | 'remark' | 'missing_column' | 'invalid_value';

export type SegmentType = 'straight' | 'curve' | 'slope';

export type PortStatus = 'active' | 'blocked' | 'maintenance';

export type Severity = 'low' | 'medium' | 'high';

export interface LuggageRecord {
  id: string;
  timestamp: number;
  chuteId: string;
  position: number;
  height: number;
  speed: number;
  sortingPortId?: string;
  status: LuggageStatus;
}

export interface ChuteSegment {
  id: string;
  startPosition: number;
  endPosition: number;
  type: SegmentType;
  expectedHeight: number;
  sortingPortId?: string;
}

export interface ChuteModel {
  id: string;
  name: string;
  segments: ChuteSegment[];
  pathPoints: Vector3[];
  standardHeight: number;
  maxSpeed: number;
  length: number;
}

export interface BlockRecord {
  id: string;
  sortingPortId: string;
  startTime: number;
  endTime?: number;
  luggageCount: number;
  reason?: string;
}

export interface SortingPort {
  id: string;
  name: string;
  chuteId: string;
  position: number;
  status: PortStatus;
  blockRecords: BlockRecord[];
}

export interface AnomalyEvent {
  id: string;
  type: AnomalyType;
  timestamp: number;
  chuteId: string;
  position: number;
  luggageIds: string[];
  severity: Severity;
  reviewed: boolean;
  expectedValue: number;
  actualValue: number;
  description: string;
}

export interface BadRow {
  rowIndex: number;
  rawData: string;
  type: BadRowType;
  description: string;
}

export interface DataCleanResult {
  validRows: LuggageRecord[];
  badRows: BadRow[];
  totalRows: number;
  validCount: number;
}

export interface FieldMapping {
  timestamp: string;
  chuteId: string;
  position: string;
  height: string;
  speed: string;
  sortingPortId?: string;
}

export interface SimulationState {
  simulationTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
  selectedChuteId: string | null;
  selectedLuggageId: string | null;
  showLabels: boolean;
  showPath: boolean;
}

export interface AnomalyFilters {
  types: AnomalyType[];
  reviewed?: boolean;
  chuteId?: string;
  severity?: Severity[];
}

export interface AppState {
  luggageData: LuggageRecord[];
  chuteModels: ChuteModel[];
  sortingPorts: SortingPort[];
  anomalies: AnomalyEvent[];
  badRows: BadRow[];
  activeTab: string;
  anomalyFilters: AnomalyFilters;
  isDataLoaded: boolean;
}

export interface ReportConfig {
  includeScreenshot: boolean;
  includeAnomalyList: boolean;
  includeStatistics: boolean;
  includeBadRows: boolean;
  format: 'pdf' | 'png';
  title: string;
}

export interface ReportData {
  title: string;
  generatedAt: number;
  anomalies: AnomalyEvent[];
  statistics: {
    totalLuggage: number;
    totalAnomalies: number;
    heightMismatchCount: number;
    speedOverCount: number;
    stackedCount: number;
    badRowCount: number;
  };
  screenshot?: string;
}
