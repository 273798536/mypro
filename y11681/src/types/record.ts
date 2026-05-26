import type { TrajectoryResult } from './trajectory';

export interface TrainingRecord {
  id: string;
  sessionId: string;
  timestamp: number;
  params: TrajectoryResult['params'];
  result: TrajectoryResult;
  notes: string;
  modifications: ModificationTrace[];
  tags: string[];
}

export interface ModificationTrace {
  timestamp: number;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
  source: string;
}
