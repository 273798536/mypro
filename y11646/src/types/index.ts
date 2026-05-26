export enum ChemicalCategory {
  FLAMMABLE = 'flammable',
  EXPLOSIVE = 'explosive',
  CORROSIVE = 'corrosive',
  TOXIC = 'toxic',
  OXIDIZER = 'oxidizer',
  RADIOACTIVE = 'radioactive',
  COMPRESSED = 'compressed',
  REFRIGERATED = 'refrigerated'
}

export enum HazardLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  EXTREME = 'extreme'
}

export enum RiskType {
  INCOMPATIBLE_NEIGHBOR = 'incompatible_neighbor',
  TEMPERATURE_EXCEED = 'temperature_exceed',
  HUMIDITY_EXCEED = 'humidity_exceed',
  INSUFFICIENT_DISTANCE = 'insufficient_distance',
  RESTRICTED_CATEGORY = 'restricted_category'
}

export enum Severity {
  WARNING = 'warning',
  DANGER = 'danger',
  CRITICAL = 'critical'
}

export interface Chemical {
  id: string;
  name: string;
  formula: string;
  category: ChemicalCategory;
  hazardLevel: HazardLevel;
  minTemp: number;
  maxTemp: number;
  minHumidity: number;
  maxHumidity: number;
  incompatibleWith: string[];
  isolationDistance: number;
  storageRequirements: string;
  icon: string;
  color: string;
}

export interface ShelfSlot {
  id: string;
  row: number;
  col: number;
  chemicalId: string | null;
  temperature: number;
  humidity: number;
  restrictedCategories: ChemicalCategory[];
  allowedCategories: ChemicalCategory[];
}

export interface Shelf {
  id: string;
  name: string;
  rows: number;
  cols: number;
  slots: ShelfSlot[];
  baseTemperature: number;
  baseHumidity: number;
}

export interface RiskEvent {
  id: string;
  type: RiskType;
  severity: Severity;
  description: string;
  chemicalIds: string[];
  slotIds: string[];
  timestamp: number;
  penalty: number;
}

export interface OperationLog {
  id: string;
  type: 'place' | 'remove' | 'swap';
  chemicalId: string;
  chemicalName?: string;
  fromSlotId?: string;
  toSlotId: string;
  toSlotPosition?: string;
  timestamp: number;
  scoreChange: number;
  risks: RiskEvent[];
}

export interface Level {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  targetScore: number;
  timeLimit: number;
  shelf: Shelf;
  availableChemicals: string[];
  requiredPlacements: number;
}

export interface GameState {
  id: string;
  levelId: string;
  startTime: number;
  endTime?: number;
  currentScore: number;
  maxPossibleScore: number;
  shelf: Shelf;
  remainingChemicals: string[];
  operationLogs: OperationLog[];
  riskEvents: RiskEvent[];
  isCompleted: boolean;
  isPaused: boolean;
}

export interface GameHistory {
  id: string;
  levelId: string;
  levelName: string;
  startTime: number;
  endTime: number;
  finalScore: number;
  maxScore: number;
  riskCount: number;
  criticalRiskCount: number;
  operations: OperationLog[];
  risks: RiskEvent[];
  reportExported: boolean;
  duration: number;
}
