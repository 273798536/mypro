export type FrequencyBand = 63 | 125 | 250 | 500 | 1000 | 2000 | 4000 | 8000;

export const FREQUENCY_BANDS: FrequencyBand[] = [63, 125, 250, 500, 1000, 2000, 4000, 8000];

export interface RoadNoiseSource {
  id: string;
  name: string;
  trafficVolume: number;
  speedLimit: number;
  heavyVehicleRatio: number;
  spectrum: Record<FrequencyBand, number | null>;
  sourceFile?: string;
  sourceLine?: number;
}

export interface SoundBarrier {
  id: string;
  name: string;
  height: number;
  length: number;
  distanceFromRoad: number;
  materialId: string;
  position: { lat: number; lng: number };
}

export interface AcousticMaterial {
  id: string;
  name: string;
  sourceFile?: string;
  sourceLine?: number;
  transmissionLoss: Record<FrequencyBand, number | null>;
  absorptionCoefficient: Record<FrequencyBand, number | null>;
}

export interface ResidentPoint {
  id: string;
  name: string;
  position: { lat: number; lng: number };
  distanceFromRoad: number;
  receiverHeight: number;
}

export interface CalculationResult {
  id: string;
  residentPointId: string;
  barrierId: string;
  insertionLoss: Record<FrequencyBand, number | null>;
  reducedLevel: Record<FrequencyBand, number | null>;
  totalAttenuation: number;
  unit: string;
  applicableScope: string;
  calculationMethod: string;
  timestamp: number;
}

export type ErrorType = 'frequency_missing' | 'duplicate_point' | 'material_incomplete' | 'alignment_error' | 'value_out_of_range' | 'calculation_failed';

export interface ValidationError {
  id: string;
  type: ErrorType;
  severity: 'error' | 'warning';
  message: string;
  source?: {
    fileName?: string;
    lineNumber?: number;
    materialId?: string;
    residentPointId?: string;
    frequencyBand?: FrequencyBand;
    field?: string;
  };
  suggestion: string;
}

export interface AppState {
  roadNoiseSources: RoadNoiseSource[];
  barriers: SoundBarrier[];
  materials: AcousticMaterial[];
  residentPoints: ResidentPoint[];
  results: CalculationResult[];
  errors: ValidationError[];
  selectedRoadNoiseId: string | null;
  selectedBarrierId: string | null;
  selectedResidentPointId: string | null;
}
