export interface TerrainGrid {
  id: string;
  name: string;
  gridSize: { width: number; height: number };
  cellSize: number;
  elevations: number[][];
  minElevation: number;
  maxElevation: number;
  unit: 'meter' | 'feet';
  createdAt: string;
  updatedAt: string;
}

export interface VillagePoint {
  id: string;
  name: string;
  x: number;
  y: number;
  elevation: number;
  population: number;
  riskLevel: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface SpillwayPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  elevation: number;
  designFlow: number;
}

export interface WaterLevelRecord {
  level: number;
  capacity: number;
  submergedArea: number;
  timestamp: string;
}

export interface CapacityCurvePoint {
  level: number;
  capacity: number;
}

export interface ValidationResult {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'unit' | 'duplicate' | 'interpolation' | 'boundary' | 'gap';
  message: string;
  reason: string;
  suggestion: string;
  affectedData?: string[];
}

export interface TerrainConclusion {
  minElevation: number;
  maxElevation: number;
  totalArea: number;
  submergedAreaAtCurrentLevel: number;
  capacityAtCurrentLevel: number;
  villagesAtRisk: string[];
  timestamp: string;
}

export interface ChangeRecord {
  field: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
}
