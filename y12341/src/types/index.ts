export type ExperimentStatus = 'pending' | 'confirmed' | 'anomaly' | 'normal';

export type AnomalyType =
  | 'thickness_missing'
  | 'boundary_jump'
  | 'sensor_drift'
  | 'data_incomplete'
  | 'boundary_temp_missing'
  | 'material_id_missing'
  | 'low_fit_quality'
  | 'calculation_error';

export interface TemperaturePoint {
  time: number;
  temperature: number;
  sensorId?: number;
}

export interface Experiment {
  id: string;
  materialId: string | null;
  thickness: number | null;
  boundaryTemp: number | null;
  temperaturePoints: TemperaturePoint[];
  sourceFile: string;
  batchId: string;
  status: ExperimentStatus;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  rowIndex?: number;
}

export interface CalculationResult {
  id: string;
  experimentId: string;
  thermalConductivity: number;
  rSquared: number;
  fitEquation: string;
  fitParameters: number[];
  calculationTrace: string;
  calculatedAt: string;
  fitPoints?: TemperaturePoint[];
}

export interface AnomalyRecord {
  id: string;
  experimentId: string;
  type: AnomalyType;
  severity: 'warning' | 'error';
  description: string;
  affectedPoints?: number[];
  detectedAt: string;
}

export interface AppState {
  experiments: Experiment[];
  results: CalculationResult[];
  anomalies: AnomalyRecord[];
  selectedBatchId: string | null;
  isCalculating: boolean;
}

export type Action =
  | { type: 'IMPORT_DATA'; payload: Experiment[] }
  | { type: 'UPDATE_EXPERIMENT'; payload: { id: string; updates: Partial<Experiment> } }
  | { type: 'LOCK_EXPERIMENT'; payload: string }
  | { type: 'UNLOCK_EXPERIMENT'; payload: string }
  | { type: 'SET_CALCULATING'; payload: boolean }
  | { type: 'CALCULATION_COMPLETE'; payload: { results: CalculationResult[]; anomalies: AnomalyRecord[]; updatedExperiments: Experiment[] } }
  | { type: 'CONFIRM_PENDING'; payload: string }
  | { type: 'REJECT_PENDING'; payload: string }
  | { type: 'RECALCULATE_SINGLE'; payload: string }
  | { type: 'CLEAR_ALL' };

export interface CSVMapping {
  timeColumn: string;
  tempColumn: string;
  materialColumn?: string;
  thicknessColumn?: string;
  boundaryTempColumn?: string;
  sensorColumn?: string;
}

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  thickness_missing: '厚度缺失',
  boundary_jump: '边界突变',
  sensor_drift: '传感器漂移',
  data_incomplete: '数据不完整',
  boundary_temp_missing: '边界温度缺失',
  material_id_missing: '材料编号缺失',
  low_fit_quality: '拟合质量差',
  calculation_error: '计算错误',
};

export const STATUS_LABELS: Record<ExperimentStatus, string> = {
  pending: '待确认',
  confirmed: '已确认',
  anomaly: '异常',
  normal: '正常',
};

export const STATUS_COLORS: Record<ExperimentStatus, string> = {
  pending: 'bg-amber-50 border-amber-400 text-amber-800',
  confirmed: 'bg-blue-50 border-blue-400 text-blue-800',
  anomaly: 'bg-red-50 border-red-400 text-red-800',
  normal: 'bg-emerald-50 border-emerald-400 text-emerald-800',
};
