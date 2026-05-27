export type ResistanceUnit = 'ohm' | 'kohm' | 'mohm';
export type InductanceUnit = 'h' | 'mh' | 'uh';
export type CapacitanceUnit = 'f' | 'uf' | 'nf' | 'pf';
export type WaveformType = 'step' | 'pulse' | 'sinusoidal';
export type DampingType = 'underdamped' | 'critically_damped' | 'overdamped' | 'undamped';
export type SourceType = 'manual' | 'history' | 'template';
export type AlertType = 'warning' | 'error' | 'info';
export type AlertCategory = 'unit_mismatch' | 'damping_misjudgment' | 'missing_initial' | 'invalid_range';
export type AlertStatus = 'pending' | 'fixed' | 'ignored' | 'manual_confirm';
export type RecordStatus = 'unprocessed' | 'auto_corrected' | 'manual_confirm' | 'completed';

export interface ParameterValue<T> {
  value: number;
  unit: T;
  rawInput: string;
}

export interface CorrectionRecord {
  timestamp: number;
  field: string;
  oldValue: string;
  newValue: string;
  reason: string;
  autoCorrected: boolean;
}

export interface InputWaveform {
  type: WaveformType;
  amplitude: number;
  frequency?: number;
  pulseWidth?: number;
}

export interface InitialConditions {
  inductorCurrent: number;
  capacitorVoltage: number;
  enabled: boolean;
}

export interface RLCParameters {
  id: string;
  timestamp: number;
  source: SourceType;
  resistance: ParameterValue<ResistanceUnit>;
  inductance: ParameterValue<InductanceUnit>;
  capacitance: ParameterValue<CapacitanceUnit>;
  inputWaveform: InputWaveform;
  initialConditions: InitialConditions;
  corrections: CorrectionRecord[];
}

export interface ResponseData {
  timePoints: number[];
  voltagePoints: number[];
  currentPoints: number[];
  samplingRate: number;
  totalTime: number;
}

export interface OvershootData {
  exists: boolean;
  value: number;
  percentage: number;
  time: number;
}

export interface CalculationResult {
  dampingRatio: number;
  naturalFrequency: number;
  dampingType: DampingType;
  characteristicRoots: [number, number];
  response: ResponseData;
  overshoot: OvershootData;
  steadyStateValue: number;
  riseTime: number;
  settlingTime: number;
}

export interface AnomalyAlert {
  id: string;
  type: AlertType;
  category: AlertCategory;
  message: string;
  details: string;
  suggestion: string;
  autoFixable: boolean;
  status: AlertStatus;
  affectedFields: string[];
}

export interface ReportRecord {
  parameterId: string;
  timestamp: number;
  status: RecordStatus;
  anomalies: string[];
  corrections: string[];
  dampingType: string;
  overshoot: number;
}

export interface AnalysisReport {
  generatedAt: number;
  summary: {
    totalRecords: number;
    unprocessed: number;
    autoCorrected: number;
    needManualConfirm: number;
    completed: number;
  };
  records: ReportRecord[];
}

export interface AppState {
  parameters: RLCParameters;
  result: CalculationResult | null;
  alerts: AnomalyAlert[];
  history: RLCParameters[];
  report: AnalysisReport | null;
  isCalculating: boolean;
}
