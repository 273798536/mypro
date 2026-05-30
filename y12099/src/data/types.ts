export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type ShadowSeverity = 'none' | 'low' | 'medium' | 'high' | 'critical';

export type ShadowCause = 'obstacle' | 'self' | 'azimuth';

export type ObstacleType = 'chimney' | 'antenna' | 'pipe' | 'other';

export interface Roof {
  id: string;
  width: number;
  height: number;
  tilt: number;
  azimuth: number;
  notes: string | null;
  dataQuality: 'dirty' | 'clean';
}

export interface Panel {
  id: string;
  roofId: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  efficiency?: number;
  model?: string;
  notes?: string | null;
  hasAzimuthError: boolean;
  hasSeasonMiss: boolean;
}

export interface PanelProcessed extends Panel {
  width: number;
  height: number;
  efficiency: number;
  model: string;
  isMissingFields: boolean;
}

export interface Obstacle {
  id: string;
  roofId: string;
  type: ObstacleType;
  x: number;
  y: number;
  height: number;
  notes: string | null;
  loaded: boolean;
}

export interface ShadowRecord {
  id: string;
  panelId: string;
  hour: number;
  season: Season;
  shadowRatio: number;
  severity: ShadowSeverity;
  cause: ShadowCause;
}

export interface AzimuthError {
  id: string;
  panelId: string;
  expectedAzimuth: number;
  actualAzimuth: number;
  deviation: number;
  suggestion: string;
  energyLossKwh: number;
}

export interface SeasonMiss {
  id: string;
  panelId: string;
  missedSeason: Season;
  suggestion: string;
  energyLossKwh: number;
}

export interface CameraView {
  id: string;
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  createdAt: number;
}

export interface Filters {
  severity: ShadowSeverity | 'all';
  cause: ShadowCause | 'all';
  season: Season | 'all';
  panelId: string | 'all';
}

export interface EnergyEstimate {
  hour: number;
  season: Season;
  grossKwh: number;
  shadowLossKwh: number;
  azimuthLossKwh: number;
  seasonLossKwh: number;
  netKwh: number;
}

export interface DiagnosticResult {
  shadowRecords: ShadowRecord[];
  azimuthErrors: AzimuthError[];
  seasonMisses: SeasonMiss[];
  energyEstimates: EnergyEstimate[];
  generatedAt: number;
}

export type DetailRecordType = 'shadow' | 'azimuth' | 'season';

export interface DetailRecord {
  id: string;
  type: DetailRecordType;
  panelId: string;
  title: string;
  description: string;
  severity: ShadowSeverity;
  suggestion: string;
  energyLossKwh: number;
  season?: Season;
  hour?: number;
}

export const DEFAULT_PANEL_WIDTH = 1.7;
export const DEFAULT_PANEL_HEIGHT = 1.0;
export const DEFAULT_PANEL_EFFICIENCY = 0.21;
export const DEFAULT_PANEL_MODEL = 'UNKNOWN-MODEL';
