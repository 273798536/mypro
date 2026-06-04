import type { BallConfig } from './physics';

export type LevelType = 'boundary_failure' | 'undo_restart' | 'full_settlement';

export interface Level {
  id: string;
  name: string;
  description: string;
  type: LevelType;
  duration: number;
  initialBalls: BallConfig[];
  targetAnnotations: number;
  hint: string;
  boundaryErrorConfig?: {
    ballId: string;
    triggerTime: number;
    errorMessage: string;
  };
}

export interface LevelProgress {
  levelId: string;
  completed: boolean;
  annotationCount: number;
  anomalyCount: number;
  completedAt?: number;
}
