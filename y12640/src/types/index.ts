export interface Hotspot {
  id: string;
  x: number | null;
  y: number | null;
  value: number;
  label: string;
  notes?: string;
}

export interface MapConfig {
  width: number;
  height: number;
  scale: number | null;
  scaleUnit: string;
  name: string;
}

export type DetectionType = 'empty' | 'duplicate' | 'flipped' | 'scale_error' | 'mixed_notes';

export type Severity = 'normal' | 'warning' | 'error';

export interface DetectionResult {
  id: string;
  type: DetectionType;
  severity: Severity;
  message: string;
  reference: string;
  hotspotId?: string;
}

export interface ReviewScore {
  category: string;
  score: number;
  maxScore: number;
  status: 'pass' | 'review' | 'fail';
  details: string[];
}

export interface SampleData {
  id: string;
  name: string;
  description: string;
  hotspots: Hotspot[];
  mapConfig: MapConfig;
}

export type GameStatus = 'idle' | 'running' | 'paused' | 'settled';
