export interface Note {
  id: string;
  time: number;
  type: 'normal' | 'syncopated' | 'rest';
  duration?: number;
  track: number;
  isSyncopated: boolean;
  remark?: string;
  missingField?: boolean;
  delayed?: boolean;
  delayAmount?: number;
}

export interface Track {
  id: string;
  name: string;
  bpm: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  audioUrl?: string;
  notes: Note[];
  hasDirtyData: boolean;
  description?: string;
}

export type JudgmentType = 'perfect' | 'great' | 'good' | 'miss' | 'early' | 'late';

export interface JudgmentResult {
  noteId: string;
  hitTime: number;
  judgment: JudgmentType;
  timingError: number;
  isSyncopated: boolean;
  correctTrack: number;
  selectedTrack?: number;
}

export type ErrorType = 'syncopation_miss' | 'speed_change' | 'combo_break' | 'wrong_track' | 'data_anomaly';

export interface ErrorRecord {
  id: string;
  type: ErrorType;
  time: number;
  description: string;
  suggestion: string;
  noteId?: string;
}

export interface GameSettings {
  sensitivity: 'easy' | 'normal' | 'hard';
  showRemarks: boolean;
  toleranceMode: boolean;
}

export interface GameState {
  status: 'idle' | 'playing' | 'paused' | 'finished' | 'reviewing';
  currentTime: number;
  score: number;
  combo: number;
  maxCombo: number;
  judgments: JudgmentResult[];
  errors: ErrorRecord[];
  selectedTrack: number | null;
  settings: GameSettings;
  reviewTime: number;
  isPlayingReview: boolean;
}

export interface JudgmentWindows {
  perfect: number;
  great: number;
  good: number;
}

export const JUDGMENT_WINDOWS: Record<string, JudgmentWindows> = {
  easy: { perfect: 80, great: 150, good: 250 },
  normal: { perfect: 50, great: 100, good: 200 },
  hard: { perfect: 30, great: 80, good: 150 }
};

export const SYNCOPATION_PENALTY = 0.8;

export const SCORE_VALUES: Record<JudgmentType, number> = {
  perfect: 100,
  great: 75,
  good: 50,
  miss: 0,
  early: 25,
  late: 25
};
