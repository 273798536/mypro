export type FrequencyBand = 'low' | 'mid' | 'high';

export type IssueType = 'material_missing' | 'seat_occluded' | 'frequency_error';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ImportMeta {
  batch: number;
  timestamp: number;
  fileName: string;
}

export interface Material {
  id: string;
  name: string;
  absorptionLow: number;
  absorptionMid: number;
  absorptionHigh: number;
}

export interface MaterialAssignment {
  meshName: string;
  materialId: string | null;
}

export interface SeatAcoustics {
  rt60: number | null;
  spl: number | null;
  c80: number | null;
  hasError: boolean;
  errorType?: IssueType;
}

export interface Seat {
  id: string;
  row: number;
  col: number;
  position: Vec3;
  isOccluded: boolean;
  issues: IssueType[];
  acoustics: Record<FrequencyBand, SeatAcoustics>;
}

export interface SoundSource {
  id: string;
  name: string;
  position: Vec3;
  frequency: FrequencyBand;
  power: number;
  directivity: 'omnidirectional' | 'cardioid' | 'line';
}

export interface HallModel {
  id: string;
  name: string;
  importMeta: ImportMeta;
  materials: MaterialAssignment[];
  bounds: { min: Vec3; max: Vec3 };
  geometryData?: string;
}

export interface SoundRay {
  id: string;
  sourceId: string;
  frequency: FrequencyBand;
  path: Vec3[];
  times: number[];
  intensity: number[];
  hitSeatIds: string[];
  bouncedSurfaces: string[];
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
}

export interface ValidationResult {
  isValid: boolean;
  issues: {
    type: IssueType;
    message: string;
    relatedId?: string;
  }[];
}

export type HeatMapMetric = 'rt60' | 'spl' | 'c80';

export interface FilterState {
  frequencyBands: FrequencyBand[];
  issueTypes: IssueType[];
  selectedSeatIds: string[];
  showOnlyIssues: boolean;
}
