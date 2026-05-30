export interface Point2D {
  x: number;
  y: number;
}

export interface LineSegment2D {
  start: Point2D;
  end: Point2D;
}

export const distance2D = (p1: Point2D, p2: Point2D): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const pointToLineDistance = (
  point: Point2D,
  lineStart: Point2D,
  lineEnd: Point2D
): number => {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;
  return Math.sqrt(dx * dx + dy * dy);
};

export const lineSegmentsIntersect = (
  seg1: LineSegment2D,
  seg2: LineSegment2D
): Point2D | null => {
  const { start: p1, end: p2 } = seg1;
  const { start: p3, end: p4 } = seg2;

  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);

  if (Math.abs(denom) < 0.0001) return null;

  const ua =
    ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const ub =
    ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

  if (ua > 0.01 && ua < 0.99 && ub > 0.01 && ub < 0.99) {
    return {
      x: p1.x + ua * (p2.x - p1.x),
      y: p1.y + ua * (p2.y - p1.y),
    };
  }

  return null;
};

export const circlesIntersect = (
  c1: Point2D & { radius: number },
  c2: Point2D & { radius: number }
): boolean => {
  const dist = distance2D(c1, c2);
  return dist < c1.radius + c2.radius;
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};
