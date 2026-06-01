export interface Flywheel {
  id: string;
  name: string;
  material: string;
  radius: number;
  radiusUnit: 'mm' | 'cm' | 'm';
  rawRadiusInput: string;
  mass: number;
  frictionCoeff: number | null;
  batchNo: string;
  createTime: number;
}

export interface AngularVelocityRecord {
  id: string;
  flywheelId: string;
  timestamp: number;
  omega: number;
  alpha: number;
  torque: number;
  source: 'sensor' | 'manual' | 'import';
  isValid: boolean;
}

export interface SamplingGap {
  id: string;
  flywheelId: string;
  startTime: number;
  endTime: number;
  duration: number;
  materialInvolved: string;
  reason: 'data_loss' | 'sensor_error' | 'manual_skip';
  isInterpolated: boolean;
  interpolationMethod?: string;
}

export interface UnitError {
  id: string;
  flywheelId: string;
  field: 'radius' | 'mass' | 'inertia';
  inputValue: string;
  inputUnit: string;
  expectedUnit: string;
  expectedValue: number;
  materialName: string;
  severity: 'warning' | 'error';
}

export interface FrictionOmission {
  id: string;
  flywheelId: string;
  materialName: string;
  batchNo: string;
  estimatedDeviation: number;
  isConfigured: boolean;
}

export interface InertiaResult {
  id: string;
  flywheelId: string;
  timeRange: [number, number];
  theoreticalInertia: number;
  measuredInertia: number;
  frictionCorrection: number;
  finalInertia: number;
  deviation: number;
  calculationTrace: {
    angularVelocityIds: string[];
    formula: string;
    steps: Array<{ param: string; value: number; source: string }>;
  };
  gapsInvolved: string[];
  errorsInvolved: string[];
}

export interface MeasurementReport {
  id: string;
  flywheelId: string;
  reportNo: string;
  reportDate: string;
  reportedInertia: number;
  reportedUnit: string;
  rawDataSnapshot: {
    flywheel: Flywheel;
    angularVelocities: AngularVelocityRecord[];
    results: InertiaResult[];
  };
  angularVelocityIds: string[];
  status: 'draft' | 'final' | 'conflicting';
}

export interface BatchComparison {
  batchNo: string;
  flywheelIds: string[];
  averageInertia: number;
  stdDeviation: number;
  outliers: string[];
  comparisonChartData: Array<{ batch: string; inertia: number; deviation: number }>;
}

export interface AppState {
  flywheels: Flywheel[];
  selectedFlywheelId: string | null;
  angularVelocities: AngularVelocityRecord[];
  samplingGaps: SamplingGap[];
  unitErrors: UnitError[];
  frictionOmissions: FrictionOmission[];
  inertiaResults: InertiaResult[];
  reports: MeasurementReport[];
  selectedTimeRange: [number, number] | null;
  isPlaying: boolean;
  playbackSpeed: number;
  currentTime: number;
  showDetailPanel: boolean;
  selectedResultId: string | null;
}

export interface AppActions {
  setSelectedFlywheel: (id: string | null) => void;
  updateFlywheel: (flywheel: Flywheel) => void;
  setSelectedTimeRange: (range: [number, number] | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setCurrentTime: (time: number | ((prev: number) => number)) => void;
  setShowDetailPanel: (show: boolean) => void;
  setSelectedResultId: (id: string | null) => void;
  addAngularVelocityRecord: (record: AngularVelocityRecord) => void;
  importAngularVelocities: (records: AngularVelocityRecord[]) => void;
  recalculateInertia: () => void;
  detectErrors: () => void;
  generateReport: () => MeasurementReport;
  loadMockData: () => void;
}
