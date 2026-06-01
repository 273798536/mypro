export type CrossSectionUnit = 'm²' | 'cm²' | 'mm²';
export type ResistanceUnit = 'Ω' | 'kΩ' | 'mΩ';
export type TimeUnit = 's' | 'ms' | 'μs';
export type MagneticUnit = 'T' | 'mT' | 'μT';
export type EmfUnit = 'V' | 'mV' | 'μV';
export type CoilStatus = 'normal' | 'invalid' | 'deprecated';
export type MagneticStatus = 'complete' | 'partial' | 'invalid';
export type AnomalyType = 'missing_turns' | 'time_unit_error' | 'flux_reversal' | 'other';
export type AnomalySeverity = 'critical' | 'warning' | 'info';
export type OperationType = 'create' | 'update' | 'supplement' | 'delete' | 'recalculate';

export interface Coil {
  id: string;
  name: string;
  turns: number;
  crossSection: number;
  crossSectionUnit: CrossSectionUnit;
  resistance: number;
  resistanceUnit: ResistanceUnit;
  material: string;
  remark: string;
  status: CoilStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MagneticDataPoint {
  time: number;
  magneticFlux: number;
  isSupplemented?: boolean;
  remark?: string;
}

export interface MagneticSequence {
  id: string;
  coilId: string;
  name: string;
  dataPoints: MagneticDataPoint[];
  timeUnit: TimeUnit;
  magneticUnit: MagneticUnit;
  isSupplemented: boolean;
  supplementedFromId?: string;
  remark: string;
  status: MagneticStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CalculationResult {
  time: number;
  magneticFlux: number;
  emf: number;
  dPhiDt: number;
}

export interface Anomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  timestamp: number;
  description: string;
  dataPointIndex?: number;
  isResolved: boolean;
}

export interface BoundaryCheck {
  minEmf: number;
  maxEmf: number;
  avgEmf: number;
  isWithinBounds: boolean;
}

export interface Report {
  id: string;
  coilId: string;
  magneticId: string;
  name: string;
  calculationResults: CalculationResult[];
  anomalies: Anomaly[];
  emfUnit: EmfUnit;
  boundaryCheck: BoundaryCheck;
  hasMissingTurns: boolean;
  hasTimeUnitError: boolean;
  hasFluxReversal: boolean;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryRecord {
  id: string;
  reportId?: string;
  operationType: OperationType;
  operationDetail: string;
  affectedItems: string[];
  operator: string;
  previousValue?: unknown;
  newValue?: unknown;
  createdAt: string;
}

export interface SupplementImpact {
  dataPointIndex: number;
  previousEmf: number;
  newEmf: number;
  deltaEmf: number;
  affectedReportIds: string[];
}

export interface UnitConversionFactors {
  [key: string]: number;
}

export interface StoreState {
  coils: Coil[];
  magneticSequences: MagneticSequence[];
  reports: Report[];
  history: HistoryRecord[];
  loading: boolean;
  error: string | null;
}

export interface StoreActions {
  loadData: () => void;
  addCoil: (coil: Omit<Coil, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCoil: (id: string, coil: Partial<Coil>) => void;
  deleteCoil: (id: string) => void;
  addMagneticSequence: (sequence: Omit<MagneticSequence, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMagneticSequence: (id: string, sequence: Partial<MagneticSequence>) => void;
  deleteMagneticSequence: (id: string) => void;
  supplementMagneticData: (sequenceId: string, newPoints: MagneticDataPoint[]) => SupplementImpact[] | null;
  addReport: (report: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateReport: (id: string, report: Partial<Report>) => void;
  deleteReport: (id: string) => void;
  recalculateReport: (reportId: string) => void;
  addHistoryRecord: (record: Omit<HistoryRecord, 'id' | 'createdAt'>) => void;
  clearError: () => void;
}
