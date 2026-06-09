import type { Point, Range } from '../types';

export function generateSvgPath(points: Point[], width: number, height: number, padding: number): string {
  if (points.length === 0) return '';

  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const maxVolume = Math.max(...points.map(p => p.volume));
  const minPh = 0;
  const maxPh = 14;

  const xFor = (v: number) => padding + (v / maxVolume) * innerWidth;
  const yFor = (ph: number) => padding + innerHeight - ((ph - minPh) / (maxPh - minPh)) * innerHeight;

  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.volume).toFixed(2)} ${yFor(p.ph).toFixed(2)}`)
    .join(' ');
}

export function findJumpRange(points: Point[]): Range {
  if (points.length < 3) return { start: 0, end: 0 };

  let maxDiff = 0;
  let startIdx = 0;

  for (let i = 1; i < points.length; i++) {
    const diff = Math.abs(points[i].ph - points[i - 1].ph);
    if (diff > maxDiff) {
      maxDiff = diff;
      startIdx = i - 1;
    }
  }

  return {
    start: points[Math.max(0, startIdx - 1)]?.volume ?? points[0].volume,
    end: points[Math.min(points.length - 1, startIdx + 2)]?.volume ?? points[points.length - 1].volume,
  };
}

export function findEndpoint(points: Point[], jumpRange: Range): { volume: number; ph: number } {
  const midVolume = (jumpRange.start + jumpRange.end) / 2;
  let closest = points[0];
  let minDist = Infinity;

  for (const p of points) {
    const dist = Math.abs(p.volume - midVolume);
    if (dist < minDist) {
      minDist = dist;
      closest = p;
    }
  }

  return { volume: closest.volume, ph: closest.ph };
}

export function getAxisTicks(): { volumes: number[]; phValues: number[] } {
  return {
    volumes: [0, 5, 10, 15, 20, 25],
    phValues: [0, 2, 4, 6, 7, 8, 10, 12, 14],
  };
}
