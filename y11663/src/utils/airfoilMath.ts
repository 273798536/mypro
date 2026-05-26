
import type { Point2D } from '../types';

export function generateNACA4Digit(
  designation: string,
  numPoints: number = 100
): Point2D[] {
  const match = designation.match(/NACA\s*(\d)(\d)(\d{2})/i);
  if (!match) {
    throw new Error('Invalid NACA 4-digit designation');
  }

  const m = parseInt(match[1]) / 100;
  const p = parseInt(match[2]) / 10;
  const t = parseInt(match[3]) / 100;

  const coordinates: Point2D[] = [];
  const halfPoints = Math.floor(numPoints / 2);

  for (let i = 0; i <= halfPoints; i++) {
    const x = 0.5 * (1 - Math.cos((Math.PI * i) / halfPoints));

    const yt =
      5 *
      t *
      (0.2969 * Math.sqrt(x) -
        0.126 * x -
        0.3516 * x * x +
        0.2843 * x * x * x -
        0.1015 * x * x * x * x);

    let yc = 0;
    let dyc_dx = 0;

    if (p > 0 && m > 0) {
      if (x <= p) {
        yc = (m / (p * p)) * (2 * p * x - x * x);
        dyc_dx = (2 * m / (p * p)) * (p - x);
      } else {
        yc = (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * x - x * x);
        dyc_dx = (2 * m / ((1 - p) * (1 - p))) * (p - x);
      }
    }

    const theta = Math.atan(dyc_dx);

    const xu = x - yt * Math.sin(theta);
    const yu = yc + yt * Math.cos(theta);
    const xl = x + yt * Math.sin(theta);
    const yl = yc - yt * Math.cos(theta);

    coordinates.push({ x: xu, y: yu });
    if (i > 0 && i < halfPoints) {
      coordinates.unshift({ x: xl, y: yl });
    }
  }

  return coordinates;
}

export function scaleCoordinates(
  coordinates: Point2D[],
  chordLength: number
): Point2D[] {
  return coordinates.map((p) => ({
    x: p.x * chordLength,
    y: p.y * chordLength,
  }));
}

export function translateCoordinates(
  coordinates: Point2D[],
  dx: number,
  dy: number
): Point2D[] {
  return coordinates.map((p) => ({
    x: p.x + dx,
    y: p.y + dy,
  }));
}

export function rotateCoordinates(
  coordinates: Point2D[],
  angleDeg: number,
  centerX: number = 0,
  centerY: number = 0
): Point2D[] {
  const angleRad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  return coordinates.map((p) => {
    const dx = p.x - centerX;
    const dy = p.y - centerY;
    return {
      x: centerX + dx * cos - dy * sin,
      y: centerY + dx * sin + dy * cos,
    };
  });
}

export function getUpperSurfacePoints(coordinates: Point2D[]): Point2D[] {
  const midIndex = Math.floor(coordinates.length / 2);
  return coordinates.slice(0, midIndex + 1);
}

export function getLowerSurfacePoints(coordinates: Point2D[]): Point2D[] {
  const midIndex = Math.floor(coordinates.length / 2);
  return coordinates.slice(midIndex);
}
