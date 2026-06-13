export interface NameplateRecord {
  id: string;
  deviceId: string;
  deviceName?: string;
  torqueValue: number | null;
  torqueUnit: string;
  ratedSpeed?: number;
  power?: number;
  threshold?: number;
  thresholdUnit?: string;
  thresholdSource?: string;
  sourceFile: string;
  sourceRow: number;
  sourceBatch: string;
  sourceContent: string;
  importedAt: number;
}

export interface AnomalyItem {
  type: 'unit_unclear' | 'order_of_magnitude' | 'over_threshold' | 'under_threshold' | 'missing_data' | 'batch_conflict' | 'calc_deviation';
  severity: 'high' | 'medium' | 'low';
  message: string;
  sourceRef?: string;
}

export interface UnitConversion {
  fromUnit: string;
  toUnit: string;
  factor: number;
  detected: boolean;
  displayName: string;
}

export interface TorqueCalcResult {
  recordId: string;
  deviceId: string;
  deviceName?: string;
  originalValue: number | null;
  originalUnit: string;
  normalizedValue: number;
  unitConversion: UnitConversion;
  calculatedTorque: number | null;
  calcMethod: string;
  status: 'normal' | 'warning' | 'error' | 'unknown';
  anomalies: AnomalyItem[];
  thresholdCheck?: {
    passed: boolean;
    threshold: number;
    thresholdUnit: string;
    thresholdSource: string;
    ratio: number;
  };
  sourceFile: string;
  sourceRow: number;
  sourceBatch: string;
  sourceContent: string;
  importedAt: number;
}

export interface DataBatch {
  id: string;
  fileName: string;
  importedAt: number;
  recordCount: number;
  note?: string;
}

export type RecordStatus = 'normal' | 'warning' | 'error' | 'unknown';

export const STATUS_LABELS: Record<RecordStatus, string> = {
  normal: '正常',
  warning: '异常',
  error: '错误',
  unknown: '未知',
};

export const STATUS_COLORS: Record<RecordStatus, string> = {
  normal: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  warning: 'bg-orange-100 text-orange-700 border-orange-200',
  error: 'bg-red-100 text-red-700 border-red-200',
  unknown: 'bg-gray-100 text-gray-600 border-gray-200',
};
