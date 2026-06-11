export type PointStatus = 'normal' | 'overlap' | 'bad_data' | 'missing' | 'late';

export type DecisionType = 'supply' | 'release' | 'pending';

export interface PointData {
  id: string;
  name: string;
  rackIndex: number;
  rowIndex: number;
  x: number;
  y: number;
  z: number;
  status: PointStatus;
  calcFormula: string;
  sourceRow: number;
  sourceFile: string;
  attachments: string[];
  phaseId: string;
  temperature?: number;
  airflow?: number;
  note?: string;
}

export interface PhaseData {
  id: string;
  name: string;
  date: string;
  description: string;
}

export interface AnomalyResult {
  id: string;
  type: 'overlap' | 'bad_data';
  pointIds: string[];
  severity: 'warning' | 'error';
  title: string;
  humanSteps: string[];
}

export interface DecisionItem {
  id: string;
  type: DecisionType;
  pointId: string;
  description: string;
  actionText: string;
  owner?: string;
}

export interface ViewState {
  selectedPointId: string | null;
  currentPhaseId: string;
  statusFilter: PointStatus | 'all';
  showDecisionPanel: boolean;
  activeDecisionTab: DecisionType;
  expandedAnomalyId: string | null;
}
