export type JudgmentResult = 'perfect' | 'great' | 'good' | 'miss';

export type EventType = 'switch_delay' | 'syncopation_miss' | 'speed_change' | 'combo_misjudge' | 'conflict';

export type GamePhase = 'idle' | 'playing' | 'paused' | 'ended';

export interface BeatTrackInfo {
  noteId: string;
  expectedTrack: number;
  expectedTime: number;
  isSyncopation: boolean;
}

export interface TrainInfo {
  trainId: string;
  actualTrack: number;
  arrivalTime: number;
  switchDelay: number;
}

export interface PlatformInfo {
  platformId: string;
  designatedTrack: number;
  openTime: number;
}

export interface BeatNote {
  id: string;
  trackIndex: number;
  targetTime: number;
  isSyncopation: boolean;
  bpm: number;
  sourceBeat: BeatTrackInfo;
  sourceTrain: TrainInfo;
  sourcePlatform: PlatformInfo;
  judged: boolean;
}

export interface ConflictDetail {
  id: string;
  timestamp: number;
  sourceA: string;
  sourceB: string;
  field: string;
  valueA: string;
  valueB: string;
  resolution: string;
  relatedNoteId: string;
}

export interface TimedEvent {
  id: string;
  timestamp: number;
  type: EventType;
  description: string;
  relatedJudgmentId?: string;
  order: number;
}

export interface TrackSwitch {
  id: string;
  fromTrack: number;
  toTrack: number;
  triggerTime: number;
  arrivalDelay: number;
  isDelivered: boolean;
}

export interface ErrorDeduction {
  id: string;
  judgmentId: string;
  errorType: string;
  description: string;
  deduction: number;
  source: string;
}

export interface JudgmentRecord {
  id: string;
  beatNoteId: string;
  judgmentTime: number;
  result: JudgmentResult;
  deviation: number;
  sources: {
    beatTrack: BeatTrackInfo;
    train: TrainInfo;
    platform: PlatformInfo;
  };
  hasConflict: boolean;
  conflictDetails: ConflictDetail[];
  finalBasis: string;
  scoreChange: number;
  comboAtTime: number;
  events: TimedEvent[];
  errorDeductions: ErrorDeduction[];
}

export interface ScoreExport {
  sessionId: string;
  totalScore: number;
  maxCombo: number;
  perfectCount: number;
  greatCount: number;
  goodCount: number;
  missCount: number;
  judgments: JudgmentRecord[];
  conflicts: ConflictDetail[];
  events: TimedEvent[];
  mapping: ScoreMapping[];
}

export interface ScoreMapping {
  beatTrackId: string;
  trainId: string;
  platformId: string;
  judgmentId: string;
  scoreRecordId: string;
}

export interface JudgeWindow {
  perfect: number;
  great: number;
  good: number;
}

export const JUDGE_WINDOWS: JudgeWindow = {
  perfect: 50,
  great: 100,
  good: 150,
};

export const SCORE_VALUES: Record<JudgmentResult, number> = {
  perfect: 100,
  great: 75,
  good: 50,
  miss: 0,
};

export const DEDUCTION_VALUES: Record<string, number> = {
  timing_deviation: 0,
  switch_delay_misjudge: 30,
  conflict_misjudge: 20,
  syncopation_miss: 15,
  speed_change_combo_break: 25,
  combo_misjudge_late: 10,
};

export const TRACK_COUNT = 4;
export const TRACK_KEYS = ['d', 'f', 'j', 'k'] as const;
