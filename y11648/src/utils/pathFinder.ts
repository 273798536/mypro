import type { Position } from '../types';

export interface PathSegment {
  start: Position;
  end: Position;
  duration: number;
}

export const calculatePath = (
  start: Position,
  end: Position,
  speed: number = 50
): PathSegment[] => {
  const distance = Math.sqrt(
    Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
  );
  const duration = (distance / speed) * 60000;

  return [
    {
      start,
      end,
      duration,
    },
  ];
};

export const calculatePositionAtTime = (
  path: PathSegment[],
  elapsedTime: number
): Position => {
  let remainingTime = elapsedTime;

  for (const segment of path) {
    if (remainingTime <= segment.duration) {
      const progress = remainingTime / segment.duration;
      return {
        x: segment.start.x + (segment.end.x - segment.start.x) * progress,
        y: segment.start.y + (segment.end.y - segment.start.y) * progress,
      };
    }
    remainingTime -= segment.duration;
  }

  const lastSegment = path[path.length - 1];
  return lastSegment ? lastSegment.end : { x: 0, y: 0 };
};

export const getTotalPathDuration = (path: PathSegment[]): number => {
  return path.reduce((total, segment) => total + segment.duration, 0);
};

export const doSegmentsIntersect = (
  seg1: PathSegment,
  seg2: PathSegment,
  timeTolerance: number = 5000
): boolean => {
  const timeOverlap =
    seg1.duration > 0 &&
    seg2.duration > 0 &&
    Math.abs(seg1.duration - seg2.duration) < timeTolerance;

  if (!timeOverlap) return false;

  const x1 = seg1.start.x;
  const y1 = seg1.start.y;
  const x2 = seg1.end.x;
  const y2 = seg1.end.y;
  const x3 = seg2.start.x;
  const y3 = seg2.start.y;
  const x4 = seg2.end.x;
  const y4 = seg2.end.y;

  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (Math.abs(denom) < 0.0001) return false;

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
};

export const generateWaypoints = (
  start: Position,
  end: Position,
  avoidAreas: { x: number; y: number; radius: number }[] = []
): Position[] => {
  const waypoints: Position[] = [start];
  const midPoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };

  let needsDetour = false;
  for (const area of avoidAreas) {
    const dist = calculateDistance(midPoint, area);
    if (dist < area.radius + 30) {
      needsDetour = true;
      break;
    }
  }

  if (needsDetour) {
    waypoints.push({
      x: midPoint.x + 50,
      y: midPoint.y - 50,
    });
  }

  waypoints.push(end);
  return waypoints;
};

const calculateDistance = (p1: Position, p2: Position): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const pathToSvgPath = (points: Position[]): string => {
  if (points.length === 0) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  return path;
};
