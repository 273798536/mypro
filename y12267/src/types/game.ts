export type DefectType = 'vacancy' | 'interstitial' | 'dislocation' | 'grain_boundary';

export type ViolationType = 'overlap' | 'energy' | 'boundary' | 'adjacency';

export interface DefectCard {
  id: string;
  type: DefectType;
  name: string;
  nameCn: string;
  energyCost: number;
  description: string;
  material: string;
  color: string;
}

export interface GridPosition {
  x: number;
  y: number;
}

export interface PlacedDefect {
  id: string;
  cardId: string;
  type: DefectType;
  position: GridPosition;
  timestamp: number;
}

export interface Violation {
  id: string;
  type: ViolationType;
  position?: GridPosition;
  defectType?: DefectType;
  message: string;
  ruleBroken: string;
  timestamp: number;
}

export interface Score {
  base: number;
  bonus: number;
  penalty: number;
  total: number;
}

export interface GameState {
  gridSize: { width: number; height: number };
  maxEnergy: number;
  currentEnergy: number;
  score: Score;
  selectedCard: DefectCard | null;
  placedDefects: PlacedDefect[];
  violations: Violation[];
  consecutiveSuccess: number;
  isSubmitted: boolean;
  minecartId: string;
}

export interface GameReport {
  minecartId: string;
  timestamp: number;
  score: Score;
  totalDefects: number;
  totalViolations: number;
  violations: Violation[];
  placedDefects: PlacedDefect[];
}

export interface ValidationResult {
  valid: boolean;
  violation?: Violation;
}
