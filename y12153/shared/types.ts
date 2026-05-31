export interface DataSource {
  name: string;
  file?: string;
  timestamp: string;
}

export interface HullParams {
  displacement: number;
  GM: number;
  rollRadius: number;
  shipLength: number;
  shipWidth: number;
  source: DataSource;
}

export interface WaveParams {
  significantHeight: number | null;
  wavePeriod: number | null;
  waveDirection: number | null;
  source: DataSource;
}

export interface NavigationParams {
  speed: number;
  speedHistory?: number[];
  headingAngle: number;
  source: DataSource;
}

export interface CabinParams {
  longitudinalPos: number;
  verticalPos: number;
  deck: number;
  source: DataSource;
}

export interface CalculateRequest {
  shipName: string;
  hullParams: HullParams;
  waveParams: WaveParams;
  navigationParams: NavigationParams;
  cabinParams: CabinParams;
}

export type AnomalyType = 'wave_missing' | 'speed_jump' | 'cabin_misalignment';
export type AnomalySeverity = 'warning' | 'error';

export interface AnomalyInfo {
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  affectedField: string;
  rawValue: any;
  source: string;
}

export interface TraceInfo {
  field: string;
  value: number;
  unit: string;
  source: string;
  formula: string;
  standard: string;
}

export interface CalculateResult {
  rollFrequency: number;
  rollAmplitude: number;
  comfortScore: number;
  comfortLevel: string;
  rollFrequencyUnit: string;
  rollAmplitudeUnit: string;
  comfortScoreUnit: string;
  applicableScope: string;
  failureReason?: string;
  calculationSuccess: boolean;
  anomalies: AnomalyInfo[];
  traceability: TraceInfo[];
  isDuplicate: boolean;
  duplicateOf?: string;
  createdAt: string;
  id: string;
  shipName: string;
}

export interface HistoryListItem {
  id: string;
  shipName: string;
  comfortScore: number;
  comfortLevel: string;
  createdAt: string;
  isDuplicate: boolean;
  hasAnomalies: boolean;
}

export interface HistoryDetail extends CalculateResult {
  hullParams: HullParams;
  waveParams: WaveParams;
  navigationParams: NavigationParams;
  cabinParams: CabinParams;
}
