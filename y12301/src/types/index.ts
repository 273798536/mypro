export interface BuildingBlock {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; depth: number; height: number };
  color: string;
  opacity: number;
  setbackDistance: number;
  requiredSetback: number;
  remarks: string;
  status: 'normal' | 'pending' | 'anomaly';
}

export interface WindDirection {
  angle: number;
  speed: number;
  frequency: number;
  timePeriod: string;
}

export interface OpenSpace {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; depth: number };
  area: number;
  type: 'park' | 'plaza' | 'river';
  visible: boolean;
}

export type AnomalyType = 'overlap' | 'wind_gap' | 'setback_error';
export type AnomalySeverity = 'warning' | 'error';

export interface AnomalyItem {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  relatedEntities: string[];
  reason: string;
  suggestion: string;
  position?: { x: number; y: number; z: number };
  overlapVolume?: number;
  obstructionRate?: number;
  setbackDeficit?: number;
  resolved: boolean;
}

export interface LayerState {
  buildings: boolean;
  windCorridors: boolean;
  openSpaces: boolean;
  windRose: boolean;
}

export type TimePeriod = 'morning' | 'noon' | 'evening' | 'night';

export const TIME_PERIODS: { key: TimePeriod; label: string }[] = [
  { key: 'morning', label: '早晨 (6:00-9:00)' },
  { key: 'noon', label: '正午 (11:00-14:00)' },
  { key: 'evening', label: '傍晚 (17:00-20:00)' },
  { key: 'night', label: '夜间 (21:00-24:00)' },
];
