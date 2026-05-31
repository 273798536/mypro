export type Note = 'C' | 'C#' | 'Db' | 'D' | 'D#' | 'Eb' | 'E' | 'E#' | 'F' | 'F#' | 'F##' | 'Gb' | 'G' | 'G#' | 'Ab' | 'A' | 'A#' | 'C##' | 'Bb' | 'Bbb' | 'B' | 'B#' | 'Cb' | 'Fb';

export type ScaleType = 'major' | 'natural_minor' | 'harmonic_minor' | 'melodic_minor';

export type ChordType = 'major' | 'minor' | 'diminished' | 'augmented' | 'seventh';

export type ErrorType = 'accidental_miss' | 'enharmonic_confusion' | 'chord_misattribution' | 'tower_late';

export type GameStatus = 'playing' | 'paused' | 'won' | 'lost';

export type TowerType = 'major' | 'minor' | 'modal';

export interface Position {
  x: number;
  y: number;
}

export interface ScaleCard {
  id: string;
  tonic: Note;
  scaleType: ScaleType;
  keySignature: Note[];
  accidentals: { note: Note; type: '#' | 'b' }[];
  displayNotes: Note[];
  intendedKey: string;
}

export interface ChordMonster {
  id: string;
  chordNotes: Note[];
  chordType: ChordType;
  intendedKey: string;
  hp: number;
  maxHp: number;
  speed: number;
  pathIndex: number;
  position: Position;
  arrivalTime: number | null;
}

export interface ModeTower {
  id: string;
  type: TowerType;
  modeName: string;
  characteristicNotes: Note[];
  damage: number;
  range: number;
  attackSpeed: number;
  level: number;
  maxLevel: number;
  position: Position | null;
  attackTime: number | null;
  isLate: boolean;
  cost: number;
  upgradeCost: number;
}

export interface TimingRecord {
  source: 'card' | 'monster' | 'tower';
  id: string;
  timestamp: number;
  data: ScaleCard | ChordMonster | ModeTower;
}

export interface JudgmentResult {
  id: string;
  timestamp: number;
  isCorrect: boolean;
  errorTypes: ErrorType[];
  conflictDetected: boolean;
  conflictDetails: string[];
  timingSequence: TimingRecord[];
  correctAnswer: string;
  userAnswer: string;
  explanation: string;
  cardData: ScaleCard;
  monsterData: ChordMonster;
  towerData: ModeTower | null;
}

export interface GameEvent {
  type: 'card_show' | 'monster_spawn' | 'tower_place' | 'tower_attack' | 'judgment' | 'life_lost' | 'wave_start' | 'wave_end' | 'game_end';
  timestamp: number;
  data: any;
}

export interface ReplayFrame {
  frameNumber: number;
  timestamp: number;
  gameState: Partial<GameState>;
  events: GameEvent[];
}

export interface WaveConfig {
  monsters: number;
  interval: number;
  keys: string[];
}

export interface Level {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  totalWaves: number;
  initialLives: number;
  initialGold: number;
  availableTowers: string[];
  scaleTypes: ScaleType[];
  errorTypes: ErrorType[];
  path: Position[];
  towerSlots: Position[];
  waves: WaveConfig[];
}

export interface GameState {
  gameId: string;
  levelId: string;
  level: Level | null;
  status: GameStatus;
  wave: number;
  totalWaves: number;
  lives: number;
  gold: number;
  combo: number;
  maxCombo: number;
  score: number;
  currentCard: ScaleCard | null;
  monsters: ChordMonster[];
  towers: ModeTower[];
  timingRecords: TimingRecord[];
  judgments: JudgmentResult[];
  events: GameEvent[];
  replayFrames: ReplayFrame[];
  startTime: number;
  endTime: number | null;
  selectedTowerId: string | null;
  lastJudgment: JudgmentResult | null;
}

export interface ScoreReport {
  gameId: string;
  levelId: string;
  levelName: string;
  startTime: number;
  endTime: number;
  duration: number;
  totalScore: number;
  maxCombo: number;
  accuracy: number;
  totalJudgments: number;
  correctCount: number;
  errorBreakdown: Record<ErrorType, number>;
  judgments: JudgmentResult[];
}

export interface SavedGame {
  gameId: string;
  levelId: string;
  levelName: string;
  startTime: number;
  endTime: number;
  score: number;
  won: boolean;
  accuracy: number;
  maxCombo: number;
  replayData: ReplayFrame[];
  judgments: JudgmentResult[];
}
