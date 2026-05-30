import { Conflict, Stage } from '@/types';
import { detectCableCrossings } from './cableDetector';
import { detectEquipmentBlocking } from './blockingDetector';
import { detectMovementCollisions } from './movementDetector';

export const detectAllConflicts = (stage: Stage): Conflict[] => {
  const conflicts: Conflict[] = [];

  conflicts.push(...detectEquipmentBlocking(stage.musicians));

  conflicts.push(...detectMovementCollisions(stage.musicians));

  if (stage.cables.length > 0) {
    conflicts.push(...detectCableCrossings(stage.cables, stage.musicians));
  }

  return conflicts;
};

export * from './cableDetector';
export * from './blockingDetector';
export * from './movementDetector';
