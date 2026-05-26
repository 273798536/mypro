export interface RoomConfig {
  width: number;
  height: number;
  depth: number;
  unit: 'm' | 'cm';
}

export interface SoundSource {
  x: number;
  y: number;
  z: number;
  frequency: number;
  amplitude: number;
}

export interface AcousticMaterial {
  id: string;
  name: string;
  source: string;
  absorptionCoefficient: Record<number, number>;
  thickness: number;
  color: string;
  createdAt: string;
  modifiedAt: string;
  version: number;
}

export type WallType = 'front' | 'back' | 'left' | 'right' | 'floor' | 'ceiling';

export interface AbsorberPanel {
  id: string;
  wall: WallType;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  materialId: string;
}

export interface MeasurementPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
}

export interface ValidationError {
  type: 'frequency' | 'parameter' | 'material' | 'position';
  severity: 'error' | 'warning';
  message: string;
  suggestion: string;
  affectedField?: string;
}

export type ModificationAction = 'create' | 'update' | 'delete' | 'import';

export interface ModificationLog {
  id: string;
  timestamp: string;
  action: ModificationAction;
  target: string;
  description: string;
  previousValue?: unknown;
  newValue?: unknown;
  source?: string;
}

export type ImportMode = 'ignore' | 'overwrite' | 'append';

export interface StandingWaveMode {
  p: number;
  q: number;
  r: number;
  frequency: number;
  type: 'axial' | 'tangential' | 'oblique';
}

export interface PressurePoint {
  x: number;
  y: number;
  z: number;
  pressure: number;
  normalizedPressure: number;
}

export interface FrequencyResponsePoint {
  frequency: number;
  dB: number;
}

export interface AppState {
  room: RoomConfig;
  soundSource: SoundSource;
  materials: AcousticMaterial[];
  absorberPanels: AbsorberPanel[];
  measurementPoints: MeasurementPoint[];
  selectedPointId: string | null;
  errors: ValidationError[];
  modificationHistory: ModificationLog[];
  importMode: ImportMode;
  showHeatmap: boolean;
  heatmapOpacity: number;
  animationSpeed: number;
}
