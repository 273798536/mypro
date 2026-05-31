export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface SolarSailParams {
  sailArea: number;
  spacecraftMass: number;
  attitudeAngle: number;
  timeStep: number;
}

export interface OrbitPoint {
  time: number;
  x: number;
  y: number;
  z: number;
  velocity: number;
  radiationPressure: number;
  acceleration: number;
}

export interface CalculationResult {
  radiationPressure: number;
  force: number;
  acceleration: number;
  velocity: Vector3;
  position: Vector3;
}

export interface ValidationRecord {
  id: string;
  timestamp: number;
  type: 'normal' | 'warning' | 'error';
  parameter: string;
  value: number;
  message: string;
  source: string;
  isValid: boolean;
}

export interface SimulationState {
  params: SolarSailParams;
  currentTime: number;
  isPlaying: boolean;
  orbitData: OrbitPoint[];
  position: Vector3;
  velocity: Vector3;
  validationRecords: ValidationRecord[];
}
