export type PlanetId = string;
export type SampleId = string;
export type PackageId = string;
export type HistoryId = string;
export type CopyrightId = string;

export interface Planet {
  id: PlanetId;
  name: string;
  description: string;
  x: number;
  y: number;
  color: string;
  availableSamples: SampleId[];
  dangerLevel: number;
  fuelCost: number;
}

export interface Sample {
  id: SampleId;
  name: string;
  sourcePlanet: PlanetId;
  quality: number;
  uniqueness: number;
  copyrightRisk: number;
  genre: string;
  bpm: number;
  createdAt: number;
}

export interface CopyrightClaim {
  id: CopyrightId;
  sampleId: SampleId;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
}

export interface NoiseEvent {
  id: string;
  type: 'static' | 'interference' | 'corruption';
  affectedSampleId: SampleId;
  severity: number;
  description: string;
}

export interface RhythmPackage {
  id: PackageId;
  name: string;
  samples: SampleId[];
  createdAt: number;
  status: 'draft' | 'completed' | 'rejected' | 'delivered';
  score: number;
  copyrightClaims: CopyrightClaim[];
  noiseEvents: NoiseEvent[];
}

export interface HistoryRecord {
  id: HistoryId;
  timestamp: number;
  type: 'collect' | 'synthesize' | 'copyright' | 'noise' | 'delivery';
  sourceRef?: {
    planetId?: PlanetId;
    sampleId?: SampleId;
    packageId?: PackageId;
  };
  action: string;
  result: 'success' | 'failure' | 'warning';
  details: Record<string, unknown>;
}

export interface GameState {
  fuel: number;
  maxFuel: number;
  score: number;
  currentPlanet: PlanetId;
  collectedSamples: SampleId[];
  packages: RhythmPackage[];
  history: HistoryRecord[];
  isGameOver: boolean;
  gameOverReason?: string;
}
