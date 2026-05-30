import { Conflict, Musician } from '@/types';
import { distance2D, generateId } from '@/utils/math';

export const detectMovementCollisions = (musicians: Musician[]): Conflict[] => {
  const conflicts: Conflict[] = [];
  const movementRadius = 1.5;

  for (let i = 0; i < musicians.length; i++) {
    for (let j = i + 1; j < musicians.length; j++) {
      const m1 = musicians[i];
      const m2 = musicians[j];

      const totalRadius = m1.radius + m2.radius + movementRadius;
      const dist = distance2D({ x: m1.x, y: m1.z }, { x: m2.x, y: m2.z });

      if (dist < totalRadius) {
        const overlap = totalRadius - dist;
        const midX = (m1.x + m2.x) / 2;
        const midZ = (m1.z + m2.z) / 2;

        conflicts.push({
          id: generateId(),
          type: 'movement_collision',
          description: `${m1.name} 与 ${m2.name} 走位区域重叠 (${overlap.toFixed(2)}m)`,
          position: [midX, 0.3, midZ],
          severity: overlap > 1 ? 'error' : 'warning',
          involvedIds: [m1.id, m2.id],
        });
      }
    }
  }

  return conflicts;
};
