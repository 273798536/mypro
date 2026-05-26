export interface Building {
  id: string;
  name: string;
  height: number;
  position: [number, number, number];
  dimensions: [number, number, number];
  source: string;
  sourceLine: number;
  color?: string;
}

export interface Playground {
  id: string;
  name: string;
  type: 'children' | 'fitness' | 'rest';
  boundary: [number, number][];
  requiredSunlight: number;
  color: string;
}

export interface SunPosition {
  azimuth: number;
  altitude: number;
}

export interface SunlightTimeSlot {
  start: number;
  end: number;
  sunlight: boolean;
}

export interface SunlightGap {
  start: number;
  end: number;
  reason: string;
}

export interface SunlightStats {
  playgroundId: string;
  date: string;
  totalMinutes: number;
  timeSlots: SunlightTimeSlot[];
  gaps: SunlightGap[];
  is达标: boolean;
}

export type ErrorType = 'timezone' | 'clipping' | 'gap' | 'data';
export type ErrorSeverity = 'warning' | 'error';

export interface ValidationError {
  id: string;
  type: ErrorType;
  message: string;
  source: string;
  sourceLine: number;
  severity: ErrorSeverity;
  timestamp: number;
}

export interface CorrectionLog {
  id: string;
  targetType: 'building' | 'playground' | 'setting';
  targetId: string;
  field: string;
  oldValue: string;
  newValue: string;
  reason: string;
  timestamp: number;
}

export interface TimeSettings {
  date: string;
  hour: number;
  minute: number;
  timezone: string;
  isPlaying: boolean;
  playSpeed: number;
}

export interface ShadowOverlay {
  timestamp: number;
  opacity: number;
  color: string;
}

export interface AppState {
  buildings: Building[];
  playgrounds: Playground[];
  selectedPlaygroundId: string | null;
  timeSettings: TimeSettings;
  errors: ValidationError[];
  corrections: CorrectionLog[];
  shadowOverlays: ShadowOverlay[];
  showShadows: boolean;
  showGrid: boolean;
}
