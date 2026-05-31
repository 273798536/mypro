import { Position } from '@/types';
import { isSamePosition, getGridPath } from './gridUtils';

export interface LineSegment {
  start: Position;
  end: Position;
}

export const doLineSegmentsIntersect = (
  seg1: LineSegment,
  seg2: LineSegment
): Position | null => {
  const { start: a, end: b } = seg1;
  const { start: c, end: d } = seg2;

  if (isSamePosition(a, c) || isSamePosition(a, d) || 
      isSamePosition(b, c) || isSamePosition(b, d)) {
    return null;
  }

  const den = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (den === 0) return null;

  const ua = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / den;
  const ub = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / den;

  if (ua > 0 && ua < 1 && ub > 0 && ub < 1) {
    return {
      x: Math.round(a.x + ua * (b.x - a.x)),
      y: Math.round(a.y + ua * (b.y - a.y))
    };
  }

  return null;
};

export const getCableSegments = (points: Position[]): LineSegment[] => {
  const segments: LineSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    segments.push({
      start: points[i],
      end: points[i + 1]
    });
  }
  return segments;
};

export const doCablesIntersect = (
  cable1Points: Position[],
  cable2Points: Position[]
): Position[] => {
  const intersections: Position[] = [];
  const segments1 = getCableSegments(cable1Points);
  const segments2 = getCableSegments(cable2Points);

  for (const seg1 of segments1) {
    for (const seg2 of segments2) {
      const intersection = doLineSegmentsIntersect(seg1, seg2);
      if (intersection) {
        intersections.push(intersection);
      }
    }
  }

  return intersections;
};

export const generateCablePath = (from: Position, to: Position): Position[] => {
  const midY = Math.floor((from.y + to.y) / 2);
  const path: Position[] = [from];
  
  if (from.y !== midY) {
    path.push({ x: from.x, y: midY });
  }
  if (from.x !== to.x) {
    path.push({ x: to.x, y: midY });
  }
  if (to.y !== midY) {
    path.push({ x: to.x, y: to.y });
  }
  
  path.push(to);
  return path;
};

export const getCableLength = (points: Position[]): number => {
  let length = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    length += Math.abs(dx) + Math.abs(dy);
  }
  return length;
};
