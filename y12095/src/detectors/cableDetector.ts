import { Cable, Conflict, Musician } from '@/types';
import { generateId, lineSegmentsIntersect, pointToLineDistance } from '@/utils/math';

export const detectCableCrossings = (
  cables: Cable[],
  musicians: Musician[]
): Conflict[] => {
  const conflicts: Conflict[] = [];

  for (let i = 0; i < cables.length; i++) {
    for (let j = i + 1; j < cables.length; j++) {
      const cable1 = cables[i];
      const cable2 = cables[j];

      for (let k = 0; k < cable1.points.length - 1; k++) {
        for (let l = 0; l < cable2.points.length - 1; l++) {
          const seg1 = {
            start: { x: cable1.points[k][0], y: cable1.points[k][2] },
            end: { x: cable1.points[k + 1][0], y: cable1.points[k + 1][2] },
          };
          const seg2 = {
            start: { x: cable2.points[l][0], y: cable2.points[l][2] },
            end: { x: cable2.points[l + 1][0], y: cable2.points[l + 1][2] },
          };

          const intersection = lineSegmentsIntersect(seg1, seg2);
          if (intersection) {
            conflicts.push({
              id: generateId(),
              type: 'cable_crossing',
              description: `线缆 ${cable1.id} 与线缆 ${cable2.id} 交叉`,
              position: [intersection.x, 0.15, intersection.y],
              severity: 'error',
              involvedIds: [cable1.id, cable2.id],
            });
          }
        }
      }
    }
  }

  cables.forEach((cable) => {
    musicians.forEach((musician) => {
      for (let i = 0; i < cable.points.length - 1; i++) {
        const dist = pointToLineDistance(
          { x: musician.x, y: musician.z },
          { x: cable.points[i][0], y: cable.points[i][2] },
          { x: cable.points[i + 1][0], y: cable.points[i + 1][2] }
        );

        if (dist < musician.radius * 0.5) {
          const midX = (cable.points[i][0] + cable.points[i + 1][0]) / 2;
          const midZ = (cable.points[i][2] + cable.points[i + 1][2]) / 2;

          const alreadyExists = conflicts.some(
            (c) =>
              c.type === 'cable_crossing' &&
              c.involvedIds.includes(cable.id) &&
              c.involvedIds.includes(musician.id)
          );

          if (!alreadyExists) {
            conflicts.push({
              id: generateId(),
              type: 'cable_crossing',
              description: `线缆 ${cable.id} 穿过 ${musician.name} 区域`,
              position: [midX, 0.15, midZ],
              severity: 'warning',
              involvedIds: [cable.id, musician.id],
            });
          }
        }
      }
    });
  });

  return conflicts;
};
