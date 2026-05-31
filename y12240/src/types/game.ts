export interface FrequencyBrick {
  id: string;
  label: string;
  freqRange: [number, number];
  centerFreq: number;
  color: string;
  glowColor: string;
  type: "low" | "mid-low" | "mid" | "mid-high" | "high";
  version: string;
}

export interface GameError {
  id: string;
  type: "aliasing" | "misalignment" | "over-filtering";
  severity: "warning" | "error";
  affectedBricks: string[];
  affectedResults: string[];
  description: string;
  deduction: number;
  beatIndex: number;
  version: string;
}

export type Judgment = "perfect" | "good" | "miss";

export interface BeatEvent {
  beatIndex: number;
  timestamp: number;
  targetBrickIds: string[];
  playerBrickIds: string[];
  judgment: Judgment;
  timingDelta: number;
  spectrumScore: number;
  rhythmScore: number;
  errors: GameError[];
}

export interface GameScore {
  spectrumSynthesisScore: number;
  rhythmJudgmentScore: number;
  waveformPlaybackScore: number;
  aliasingDeduction: number;
  misalignmentDeduction: number;
  overFilteringDeduction: number;
  totalScore: number;
  grade: "S" | "A" | "B" | "C" | "D";
}

export type Difficulty = "beginner" | "intermediate" | "master";
export type GameStatus = "idle" | "playing" | "paused" | "ended";

export interface LevelConfig {
  difficulty: Difficulty;
  brickCount: number;
  bpm: number;
  totalBeats: number;
  brickTypes: FrequencyBrick[];
  label: string;
  description: string;
}

export interface GameState {
  gameId: string;
  difficulty: Difficulty;
  status: GameStatus;
  currentBeat: number;
  totalBeats: number;
  bpm: number;
  score: GameScore;
  beatEvents: BeatEvent[];
  availableBricks: FrequencyBrick[];
  targetSequence: string[][];
  combo: number;
  maxCombo: number;
  version: string;
  startTime: number;
  selectedBrickId: string | null;
}
