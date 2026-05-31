export type SourceType =
  | 'traffic'
  | 'construction'
  | 'commercial'
  | 'industrial'
  | 'entertainment'
  | 'residential';

export type TimePeriod = 'day' | 'night';

export type AreaType = 'residential' | 'commercial' | 'industrial' | 'park';

export type RiskType = 'night_threshold' | 'source_overlap' | 'decibel_error';

export type Severity = 'low' | 'medium' | 'high';

export type GameResult = 'win' | 'lose' | null;

export type ScoreCategory = 'source' | 'mood' | 'governance' | 'penalty';

export interface SoundSource {
  id: string;
  type: SourceType;
  name: string;
  icon: string;
  baseDecibel: number;
  validPeriods: TimePeriod[];
  description: string;
  areaTypes: AreaType[];
}

export interface PlacedSource {
  id: string;
  sourceId: string;
  areaId: string;
  placedAt: number;
  placedByPlayer: boolean;
  isActive: boolean;
}

export interface CityArea {
  id: string;
  name: string;
  type: AreaType;
  sensitivity: number;
  position: { row: number; col: number };
  dayThreshold: number;
  nightThreshold: number;
}

export interface DecibelCalculation {
  areaId: string;
  sources: string[];
  rawSum: number;
  correctValue: number;
  isOverlap: boolean;
  overlapCount: number;
}

export interface RiskItem {
  id: string;
  type: RiskType;
  severity: Severity;
  title: string;
  description: string;
  cause: string;
  suggestion: string;
  relatedSources?: string[];
  relatedArea?: string;
  triggeredAt: number;
}

export interface SoundSourceRecord {
  id: string;
  timestamp: number;
  turn: number;
  action: 'place' | 'remove' | 'modify';
  sourceName: string;
  areaName: string;
  decibel: number;
  period: TimePeriod;
  detail: string;
}

export interface MoodRecord {
  id: string;
  timestamp: number;
  turn: number;
  areaName: string;
  beforeMood: number;
  afterMood: number;
  changeReason: string;
  relatedSources: string[];
}

export interface GovernanceRecord {
  id: string;
  timestamp: number;
  turn: number;
  measure: string;
  targetArea?: string;
  effect: string;
  cost: number;
}

export interface OperationRecords {
  soundSources: SoundSourceRecord[];
  residentMood: MoodRecord[];
  governance: GovernanceRecord[];
}

export interface ScoreItem {
  turn: number;
  change: number;
  reason: string;
  category: ScoreCategory;
}

export interface GovernanceMeasure {
  id: string;
  name: string;
  icon: string;
  description: string;
  cost: number;
  effect: string;
  decibelReduction: number;
}

export interface GameState {
  currentTurn: number;
  maxTurns: number;
  currentPeriod: TimePeriod;
  areas: CityArea[];
  placedSources: PlacedSource[];
  availableSourceCards: SoundSource[];
  residentMood: Record<string, number>;
  score: number;
  scoreBreakdown: ScoreItem[];
  risks: RiskItem[];
  records: OperationRecords;
  isGameOver: boolean;
  gameResult: GameResult;
  governanceMeasures: GovernanceMeasure[];
  budget: number;
}
