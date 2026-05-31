export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Magnet {
  id: string;
  name: string;
  position: Vector3;
  poleDirection: Vector3;
  strength: number;
  type: 'bar' | 'horseshoe';
  source: string;
  version: string;
  createdAt: string;
}

export interface SamplePoint {
  id: string;
  position: Vector3;
  fieldStrength: number;
  fieldDirection: Vector3;
  affectedBy: string[];
}

export interface FieldLinePoint {
  position: Vector3;
  fieldStrength: number;
}

export interface FieldLine {
  id: string;
  points: FieldLinePoint[];
  startMagnetId: string;
}

export interface ValidationWarning {
  id: string;
  type: 'pole_reverse' | 'sample_dense' | 'field_explosion';
  message: string;
  affectedLines: string[];
  affectedMagnets: string[];
}

export interface AppConfig {
  magnets: Magnet[];
  sampleDensity: number;
  showFieldLines: boolean;
  showStrengthLabels: boolean;
  syncFilters: boolean;
  version: string;
}
