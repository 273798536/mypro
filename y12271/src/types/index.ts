export interface HallModel {
  id: string;
  name: string;
  width: number;
  depth: number;
  height: number;
}

export interface Seat {
  id: string;
  row: string;
  number: number;
  x: number;
  y: number;
  z: number;
  reverbTime: number;
  isOccluded: boolean;
  missingParams: boolean;
  frequencyBandError: boolean;
}

export interface Surface {
  id: string;
  name: string;
  materialType: string;
  absorptionCoeffs: number[];
  paramsComplete: boolean;
  missingFreqBands: number[];
}

export interface SoundSource {
  id: string;
  x: number;
  y: number;
  z: number;
  powerLevel: number;
}

export type AnomalyType = 'material_missing' | 'seat_occlusion' | 'frequency_error';
export type AnomalySeverity = 'high' | 'medium' | 'low';
export type AnomalyStatus = 'pending' | 'confirmed' | 'resolved';

export interface AnomalyItem {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  relatedEntityId: string;
  description: string;
  location: { x: number; y: number; z: number };
}

export type ViewMode = '2d' | '3d';

export type FrequencyBand = '63' | '125' | '250' | '500' | '1000' | '2000' | '4000' | '8000';

export interface CorrectionSnapshot {
  id: string;
  timestamp: number;
  soundSources: SoundSource[];
  seatReverbTimes: Record<string, number>;
  label: string;
}

export type DataIntegrityLevel = 'good' | 'warning' | 'critical';
