export interface LensState {
  focalLength: number;
  objectDistance: number;
  imageDistance: number;
  magnification: number;
  isRealImage: boolean;
  isAtFocus: boolean;
  objectHeight: number;
  imageHeight: number;
}

export interface StepRecord {
  id: string;
  timestamp: number;
  state: LensState;
  source: 'user' | 'preset' | 'auto';
  note?: string;
}

export interface Warning {
  type: 'focus' | 'virtual' | 'magnification' | 'range';
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface ValidationResult {
  isValid: boolean;
  warnings: Warning[];
}

export interface RaySegment {
  start: [number, number, number];
  end: [number, number, number];
  isVirtual?: boolean;
}

export const CONSTANTS = {
  MIN_FOCAL_LENGTH: 2,
  MAX_FOCAL_LENGTH: 30,
  MIN_OBJECT_DISTANCE: 1,
  MAX_OBJECT_DISTANCE: 60,
  DEFAULT_FOCAL_LENGTH: 10,
  DEFAULT_OBJECT_DISTANCE: 25,
  DEFAULT_OBJECT_HEIGHT: 5,
  FOCUS_THRESHOLD: 2,
  SCALE: 0.5,
} as const;
