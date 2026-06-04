
export type DataSourceType = 'old_table' | 'manual' | 'original' | 'mixed';

export interface DataSource {
  type: DataSourceType;
  name: string;
  description: string;
}

export type ScaleUnit = 'meter' | 'kilometer' | 'unknown';

export interface ScaleInfo {
  ratio: string;
  unit: ScaleUnit;
  isCorrect: boolean;
  expectedRatio?: string;
}

export type AnomalyType = 'scale_mismatch' | 'coordinate_flip' | 'unit_missing' | 'manual_note';
export type AnomalySeverity = 'high' | 'medium' | 'low';

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  sourceRef: string;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  createdAt: string;
  annotation?: string;
  isFixed?: boolean;
}

export interface Point {
  id: string;
  x: number;
  y: number;
  label?: string;
}

export interface PathNode extends Point {
  isDraggable: boolean;
  anomalies: Anomaly[];
  source?: DataSourceType;
  unit?: ScaleUnit;
}

export interface TransportPath {
  id: string;
  name: string;
  nodes: PathNode[];
  source: DataSource;
  scale: ScaleInfo;
  createdAt: string;
  updatedAt: string;
  selected?: boolean;
}

export type HistoryActionType = 'move_node' | 'add_annotation' | 'fix_anomaly' | 'delete_node' | 'update_scale' | 'flip_coordinate';

export interface HistoryAction {
  id: string;
  type: HistoryActionType;
  timestamp: string;
  description: string;
  previousState: Record<string, unknown>;
  nextState: Record<string, unknown>;
}

export interface FilterState {
  dataSources: DataSourceType[];
  anomalyTypes: AnomalyType[];
  showOnlyAnomalies: boolean;
}

export type DiffViewMode = 'side_by_side' | 'overlay';
