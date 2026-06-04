import type { Point } from '@/types';

export const polygonArea = (points: Point[]): number => {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
};

const inside = (p: Point, edgeStart: Point, edgeEnd: Point): boolean => {
  return (
    (edgeEnd.x - edgeStart.x) * (p.y - edgeStart.y) >=
    (edgeEnd.y - edgeStart.y) * (p.x - edgeStart.x)
  );
};

const computeIntersection = (cp1: Point, cp2: Point, s: Point, e: Point): Point => {
  const dcx = cp1.x - cp2.x;
  const dcy = cp1.y - cp2.y;
  const dpx = s.x - e.x;
  const dpy = s.y - e.y;
  const n1 = cp1.x * cp2.y - cp1.y * cp2.x;
  const n2 = s.x * e.y - s.y * e.x;
  const n3 = 1.0 / (dcx * dpy - dcy * dpx);
  return {
    x: (n1 * dpx - n2 * dcx) * n3,
    y: (n1 * dpy - n2 * dcy) * n3
  };
};

export const sutherlandHodgmanIntersection = (
  subject: Point[],
  clip: Point[]
): Point[] => {
  let output = [...subject];
  for (let i = 0; i < clip.length; i++) {
    const cp1 = clip[i];
    const cp2 = clip[(i + 1) % clip.length];
    if (output.length === 0) break;
    const input = [...output];
    output = [];
    let s = input[input.length - 1];
    for (const e of input) {
      if (inside(e, cp1, cp2)) {
        if (!inside(s, cp1, cp2)) {
          output.push(computeIntersection(cp1, cp2, s, e));
        }
        output.push(e);
      } else if (inside(s, cp1, cp2)) {
        output.push(computeIntersection(cp1, cp2, s, e));
      }
      s = e;
    }
  }
  return output;
};

export const calculateOverlapPercentage = (
  poly1: Point[],
  poly2: Point[]
): number => {
  const intersection = sutherlandHodgmanIntersection(poly1, poly2);
  if (intersection.length < 3) return 0;
  const intersectionArea = polygonArea(intersection);
  const area1 = polygonArea(poly1);
  const area2 = polygonArea(poly2);
  const minArea = Math.min(area1, area2);
  return minArea > 0 ? (intersectionArea / minArea) * 100 : 0;
};

export const pointInPolygon = (point: Point, polygon: Point[]): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
};

export const formatPoints = (points: Point[]): string => {
  return points.map(p => `${p.x},${p.y}`).join(' ');
};

export const parsePoints = (str: string): Point[] => {
  return str.trim().split(/\s+/).map(part => {
    const [x, y] = part.split(',').map(Number);
    return { x, y };
  });
};
