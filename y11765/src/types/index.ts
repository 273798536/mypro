export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type CoilDirection = 'clockwise' | 'counterclockwise';

export interface CoilConfig {
  id: string;
  name: string;
  current: number;
  direction: CoilDirection;
  position: Vector3;
  radius: number;
  turns: number;
  enabled: boolean;
  color: string;
}

export interface SectionPlane {
  normal: Vector3;
  position: number;
  visible: boolean;
}

export interface MagneticFieldSample {
  position: Vector3;
  fieldStrength: number;
  fieldDirection: Vector3;
  sourceRef: string;
}

export interface ColorScale {
  min: number;
  max: number;
  colormap: 'viridis' | 'plasma' | 'jet' | 'rainbow';
}

export type ErrorType = 'current_direction' | 'section_missing' | 'color_scale_mismatch' | 'invalid_parameter' | 'computation_error';
export type ErrorSeverity = 'warning' | 'error';

export interface SourceLocation {
  file: string;
  line: number;
  column: number;
  functionName: string;
}

export interface ErrorRecord {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  sourceLocation: SourceLocation;
  timestamp: number;
  suggestion: string;
  rawData?: Record<string, unknown>;
}

export type OperationType = 'param_change' | 'section_adjust' | 'coil_current' | 'color_scale' | 'rotor_angle';

export interface OperationRecord {
  id: string;
  type: OperationType;
  timestamp: number;
  previousValue: unknown;
  newValue: unknown;
  sourceRef: string;
  description: string;
}

export interface MotorConfig {
  coils: CoilConfig[];
  rotorAngle: number;
  sectionPlane: SectionPlane;
  colorScale: ColorScale;
  showFieldArrows: boolean;
  showStator: boolean;
  showRotor: boolean;
  arrowDensity: number;
  arrowScale: number;
}

export interface ReportData {
  id: string;
  title: string;
  timestamp: number;
  config: MotorConfig;
  screenshots: string[];
  notes: string;
  fieldSamples: MagneticFieldSample[];
}

export interface AppState {
  motorConfig: MotorConfig;
  errors: ErrorRecord[];
  operations: OperationRecord[];
  currentReport: ReportData | null;
  isPlaying: boolean;
  animationSpeed: number;
}

export interface AppActions {
  setMotorConfig: (config: Partial<MotorConfig>) => void;
  updateCoil: (coilId: string, updates: Partial<CoilConfig>) => void;
  addError: (error: Omit<ErrorRecord, 'id' | 'timestamp'>) => void;
  clearError: (errorId: string) => void;
  clearAllErrors: () => void;
  addOperation: (operation: Omit<OperationRecord, 'id' | 'timestamp'>) => void;
  setCurrentReport: (report: ReportData | null) => void;
  resetConfig: () => void;
  saveConfig: () => void;
  loadConfig: () => boolean;
  togglePlaying: () => void;
  setAnimationSpeed: (speed: number) => void;
}
