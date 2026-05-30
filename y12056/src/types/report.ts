import type { ScoreResult } from './score';
import type { Connection } from './game';

export interface CounterexampleTrack {
  counterexampleId: string;
  content: string;
  beforeConclusion: string;
  afterConclusion: string;
  affectedSteps: string[];
}

export interface PracticeReport {
  attemptId: string;
  levelId: string;
  levelTitle: string;
  studentName?: string;
  completedAt: Date;
  scoreResult: ScoreResult;
  logicConnections: Connection[];
  counterexampleTracks: CounterexampleTrack[];
  scoreDetails: string;
  totalScore: number;
  maxScore: number;
  suggestions: string;
}
