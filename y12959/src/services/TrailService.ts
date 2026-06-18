import { executionTrails } from '../mock/data';
import type { ExecutionTrail } from '../types';

export const TrailService = {
  listByConflict(conflictId: string): ExecutionTrail[] {
    return executionTrails
      .filter((t) => t.conflictId === conflictId)
      .sort((a, b) => a.attemptNo - b.attemptNo);
  },
};
