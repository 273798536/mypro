export interface Nozzle {
  id: string;
  model: string;
  orificeDiameter: number;
  sprayAngle: number;
  nominalFlowRate: number;
  minPressure: number;
  maxPressure: number;
  manufacturer: string;
  createdAt: string;
  updatedAt: string;
}

export interface PressureRecord {
  id: string;
  nozzleId: string;
  pressure: number;
  recordTime: string;
  operator: string;
  location: string;
  remarks: string;
  isOutOfRange: boolean;
  createdAt: string;
}

export interface ValidationResult {
  pressureOutOfRange: boolean;
  pressureWarning: string | null;
  viscosityMissing: boolean;
  nozzleBlocked: boolean;
  nextStepContact: string | null;
  requiresConfirmation: boolean;
}

export interface ConclusionChange {
  field: string;
  oldValue: any;
  newValue: any;
  changedAt: string;
  changedBy: string;
  reason: string;
}

export type SprayQuality = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
export type ResultStatus = 'normal' | 'pending' | 'blocked';

export interface CalculationResult {
  id: string;
  nozzleId: string;
  pressureRecordId: string;
  flowRate: number;
  viscosity: number | null;
  viscosityAddedLater: boolean;
  dropletSize: number;
  coverageWidth: number;
  sprayQuality: SprayQuality;
  validationResult: ValidationResult;
  conclusionChanges: ConclusionChange[];
  status: ResultStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CalculationInput {
  nozzleId: string;
  pressureRecordId?: string;
  pressure: number;
  flowRate: number;
  viscosity?: number | null;
  sprayHeight?: number;
}

export interface ReportData {
  id: string;
  month: string;
  title: string;
  totalCalculations: number;
  pendingConfirmations: number;
  blockedCases: number;
  averageDropletSize: number;
  createdAt: string;
}
