import { Conflict, Musician } from '@/types';
import { circlesIntersect, distance2D, generateId } from '@/utils/math';

export const detectEquipmentBlocking = (musicians: Musician[]): Conflict[] => {
  const conflicts: Conflict[] = [];

  for (let i = 0; i < musicians.length; i++) {
    for (let j = i + 1; j < musicians.length; j++) {
      const m1 = musicians[i];
      const m2 = musicians[j];

      const dist = distance2D({ x: m1.x, y: m1.z }, { x: m2.x, y: m2.z });
      const minDist = m1.radius + m2.radius + 0.3;

      if (dist < minDist) {
        const overlap = minDist - dist;
        const midX = (m1.x + m2.x) / 2;
        const midZ = (m1.z + m2.z) / 2;

        conflicts.push({
          id: generateId(),
          type: 'equipment_blocking',
          description: `${m1.name} 与 ${m2.name} 设备距离过近 (${overlap.toFixed(2)}m 重叠)`,
          position: [midX, 0.5, midZ],
          severity: overlap > 0.5 ? 'critical' : 'error',
          involvedIds: [m1.id, m2.id],
        });
      }
    }
  }

  return conflicts;
};
