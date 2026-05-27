export type ProcessType = 'isothermal' | 'isobaric' | 'isochoric' | 'adiabatic' | 'polytropic';

export type AnomalyType =
  | 'unit_mismatch'
  | 'path_not_closed'
  | 'isothermal_adiabatic_confusion'
  | 'energy_conservation_violation'
  | 'invalid_state'
  | 'data_contradiction'
  | 'calculation_error';

export type HistoryActionType = 'create' | 'update' | 'delete' | 'calculate' | 'import';

export interface StatePoint {
  id: string;
  label: string;
  P: number;
  V: number;
  T: number;
  n?: number;
  source?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Process {
  id: string;
  from: string;
  to: string;
  type: ProcessType;
  gamma?: number;
  n?: number;
  W: number;
  Q: number;
  deltaU: number;
  source?: string;
  createdAt: number;
}

export interface SourceRef {
  type: 'state_point' | 'process' | 'input';
  id?: string;
  lineNumber?: number;
  originalValue?: string;
  field?: string;
}

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: 'warning' | 'error';
  message: string;
  sourceRef: SourceRef;
  suggestion?: string;
  timestamp: number;
}

export interface HistoryEntry {
  id: string;
  action: string;
  type: HistoryActionType;
  before: unknown;
  after: unknown;
  source?: string;
  timestamp: number;
}

export interface CycleResult {
  isClosed: boolean;
  netWork: number;
  netHeat: number;
  efficiency: number;
  heatIn: number;
  heatOut: number;
  anomalies: Anomaly[];
}

export interface ProcessCalculation {
  processId: string;
  W: number;
  Q: number;
  deltaU: number;
  formula: string;
  anomalies: Anomaly[];
}

export const PROCESS_LABELS: Record<ProcessType, string> = {
  isothermal: '等温过程',
  isobaric: '等压过程',
  isochoric: '等容过程',
  adiabatic: '绝热过程',
  polytropic: '多方过程',
};

export const PROCESS_COLORS: Record<ProcessType, string> = {
  isothermal: '#f59e0b',
  isobaric: '#3b82f6',
  isochoric: '#10b981',
  adiabatic: '#ef4444',
  polytropic: '#8b5cf6',
};

export const ANOMALY_LABELS: Record<AnomalyType, string> = {
  unit_mismatch: '单位不匹配',
  path_not_closed: '路径未闭合',
  isothermal_adiabatic_confusion: '等温绝热混淆',
  energy_conservation_violation: '能量守恒违反',
  invalid_state: '无效状态点',
  data_contradiction: '数据矛盾',
  calculation_error: '计算错误',
};

export const GAS_CONSTANT = 8.314;
